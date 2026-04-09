const crypto = require('crypto');
const Registration = require('../models/Registration');
const RegistrationToken = require('../models/RegistrationToken');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');
const CancellationAuditLog = require('../models/CancellationAuditLog');
const SeatBooking = require('../models/SeatBooking');
const { computeQrExpiry, generateQRToken, generateRegistrationQR } = require('../services/qrSecurityService');
const { registerIssuedNonce, denylistNonce } = require('../services/nonceStoreService');
const { broadcastAlert } = require('../services/alertService');
const {
  sendRegistrationEmail,
  sendCancellationEmail,
  sendWaitlistPromotionEmail,
  sendSmsNotification,
} = require('../utils/mailer');

const activeRegistrationFilter = { cancelledAt: null };

// ─── QR Helpers ──────────────────────────────────────────────────────────────

const issueQrForRegistration = async (registration, event) => {
  const issuedAt = new Date();
  const expiresAt = computeQrExpiry(event);
  const nonce = crypto.randomUUID();
  const token = generateQRToken();
  const { qrCode } = await generateRegistrationQR(token);

  await RegistrationToken.findOneAndDelete({ registrationId: registration._id });
  await RegistrationToken.create({
    token,
    registrationId: registration._id,
    studentId: registration.user,
    eventId: event._id,
    issuedAt,
    expiresAt,
    nonce,
    used: false,
  });

  registration.qrCode = qrCode;
  registration.qrEncryptedPayload = null;
  registration.qrNonce = nonce;
  registration.qrIssuedAt = issuedAt;
  registration.qrExpiresAt = expiresAt;
  registration.qrInvalidatedAt = null;

  await registerIssuedNonce({
    nonce,
    registrationId: registration._id,
    studentId: registration.user,
    eventId: event._id,
    expiresAt,
  });

  return { qrCode, token, nonce, expiresAt };
};

// ─── Auth / Deadline Helpers ─────────────────────────────────────────────────

const canManageRegistration = (actor, registration) => {
  if (!actor) return false;
  if (['admin', 'superAdmin'].includes(actor.role)) return true;
  const registrationUserId = registration.user?._id ? registration.user._id.toString() : registration.user.toString();
  return registrationUserId === actor._id.toString();
};

const cancellationDeadlinePassed = (event) => {
  const deadline = new Date(event.dateTime);
  deadline.setHours(0, 0, 0, 0);
  return new Date() >= deadline;
};

// ─── Waitlist Promotion ───────────────────────────────────────────────────────
// Promotes the oldest waitlisted student to REGISTERED, assigns the freed seat
// directly (no seat-selection step), and issues their QR.
const promoteWaitlistedStudent = async (event, freedSeatId = null) => {
  const waitlisted = await Registration.findOne({
    event: event._id,
    status: 'WAITLISTED',
    ...activeRegistrationFilter,
  }).sort({ createdAt: 1 }).populate('user', 'name email phone');

  if (!waitlisted) return null;

  waitlisted.status = 'REGISTERED';
  const qrInfo = await issueQrForRegistration(waitlisted, event);
  await waitlisted.save();

  event.registeredCount = (event.registeredCount || 0) + 1;
  event.waitlistCount = Math.max(0, (event.waitlistCount || 1) - 1);

  // Assign the freed seat directly to the promoted student (skip selection)
  if (freedSeatId) {
    try {
      await SeatBooking.deleteOne({ eventId: event.eventId, seatId: freedSeatId });
      await SeatBooking.create({
        eventId: event.eventId,
        seatId: freedSeatId,
        userId: waitlisted.user._id,
        status: 'confirmed',
        expiresAt: null,
      });
    } catch (err) {
      // Seat may already be gone — non-fatal; promoted user can pick another
      console.warn('Waitlist seat assignment failed, continuing without seat:', err.message);
    }
  }

  return { waitlisted, qrInfo, assignedSeat: freedSeatId };
};

// ─── Notification Helpers ────────────────────────────────────────────────────

const notifyCancellation = ({ registration, reason }) => {
  sendCancellationEmail({
    name: registration.user.name,
    email: registration.user.email,
    eventName: registration.event.name,
  }).catch(err => console.error('Cancellation email error:', err));

  sendSmsNotification({
    phone: registration.user.phone,
    message: `Your registration for ${registration.event.name} has been cancelled.`,
  }).catch(err => console.error('Cancellation SMS error:', err));

  broadcastAlert('registration-cancelled', {
    type: 'registration.cancelled',
    registrationId: registration._id,
    studentId: registration.user._id,
    eventId: registration.event._id,
    studentName: registration.user.name,
    eventName: registration.event.name,
    cancelledAt: registration.cancelledAt?.toISOString() || new Date().toISOString(),
    reason: reason || '',
    message: `${registration.user.name} has cancelled. Participant list updated.`,
  });
};

const notifyPromotion = ({ promoted, event, qrCode, assignedSeat }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const eventPath = `${appUrl}/events/${event.eventId}`;

  sendWaitlistPromotionEmail({
    name: promoted.user.name,
    email: promoted.user.email,
    eventName: event.name,
    signInLink: `${appUrl}/login`,
    paymentLink: eventPath,
    qrCodeBase64: qrCode,
    assignedSeat,
  }).catch(err => console.error('Waitlist promotion email error:', err));

  sendSmsNotification({
    phone: promoted.user.phone,
    message: `Great news! A seat (${assignedSeat || 'TBD'}) is now available for ${event.name}. Your registration is confirmed!`,
  }).catch(err => console.error('Waitlist promotion SMS error:', err));

  broadcastAlert('participant-promoted', {
    type: 'registration.promoted',
    registrationId: promoted._id,
    studentId: promoted.user._id,
    eventId: event._id,
    studentName: promoted.user.name,
    eventName: event.name,
    assignedSeat,
    message: `${promoted.user.name} was promoted from the waitlist for ${event.name}. Seat ${assignedSeat || 'TBD'} assigned.`,
  });
};

// ─── Register for Event ──────────────────────────────────────────────────────
// @desc    Register user for an event
// @route   POST /api/registrations
const registerForEvent = async (req, res) => {
  try {
    const { eventId, selectedDays } = req.body;
    const user = req.user;

    const event = await Event.findOne({ eventId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const userDomain = user.email.split('@')[1];
    if (userDomain !== event.collegeDomain && event.collegeDomain !== 'ALL') {
      return res.status(403).json({ message: `The event is for ${event.collegeName} students` });
    }

    // Allow re-registration after cancellation (partial unique index ignores cancelled rows)
    const existingRegistration = await Registration.findOne({
      user: user._id,
      event: event._id,
      cancelledAt: null,
    });
    if (existingRegistration) {
      return res.status(400).json({
        message: 'You are already registered or waitlisted for this event.',
        status: existingRegistration.status,
      });
    }

    const isMultiDay = Array.isArray(event.days) && event.days.length > 0;
    const validDays = isMultiDay && Array.isArray(selectedDays) && selectedDays.length > 0
      ? selectedDays.filter(day => event.days.some(eventDay => eventDay.day === day))
      : [];
    const dayCount = validDays.length || 1;
    const perDayAmount = event.amount || 500;
    const totalAmount = isMultiDay ? perDayAmount * dayCount : perDayAmount;

    const hasHallLayout = !!event.hallLayout; // events with seating require payment before REGISTERED

    let status;
    if (event.registeredCount >= event.capacity) {
      status = 'WAITLISTED';
      event.waitlistCount = (event.waitlistCount || 0) + 1;
    } else if (hasHallLayout) {
      // Seating events: hold seat first, pay to confirm — don't count as registered yet
      status = 'PENDING_PAYMENT';
    } else {
      status = 'REGISTERED';
      event.registeredCount += 1;
    }

    const generateTicketId = () => {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `TT-${dateStr}-${randomStr}`;
    };

    let registration = await Registration.findOne({
      user: user._id,
      event: event._id,
      cancelledAt: { $ne: null }
    });

    if (registration) {
      // Re-activate previously cancelled registration
      registration.status = status;
      registration.selectedDays = isMultiDay ? validDays : [];
      registration.totalAmountPaid = 0;
      registration.cancelledAt = null;
      registration.cancellationReason = null;
      registration.cancelledBy = null;
      if (!registration.ticketId) {
        registration.ticketId = generateTicketId();
      }
      // Reset payment variables
      registration.razorpayPaymentId = null;
      registration.razorpay_order_id = null;
      registration.razorpay_payment_id = null;
      registration.razorpay_signature = null;
      registration.refundStatus = 'NOT_APPLICABLE';
      registration.razorpay_refund_id = null;
      registration.refundId = null;
      await registration.save();
    } else {
      // Create new registration
      registration = await Registration.create({
        user: user._id,
        event: event._id,
        status,
        selectedDays: isMultiDay ? validDays : [],
        totalAmountPaid: 0, // payment not done yet
        ticketId: generateTicketId(),
      });
    }

    let qrCodeDataUrl = null;
    if (status === 'REGISTERED') {
      const qrInfo = await issueQrForRegistration(registration, event);
      qrCodeDataUrl = qrInfo.qrCode;
      registration.secureHash = null;
      await registration.save();
    }

    await event.save();

    // Only send confirmation email for non-pending, non-waitlisted registrations
    if (status === 'REGISTERED') {
      sendRegistrationEmail({
        name: user.name,
        email: user.email,
        eventName: event.name,
        venue: event.venue,
        dateTime: event.dateTime,
        qrCodeBase64: qrCodeDataUrl,
        status,
      }).catch(err => console.error('Email send error:', err));
    }

    const isWaitlisted = status === 'WAITLISTED';
    const isPendingPayment = status === 'PENDING_PAYMENT';

    res.status(201).json({
      message: isWaitlisted
        ? 'This event is full. You have been added to the waitlist.'
        : isPendingPayment
          ? 'Seat selection required. Choose your seat and complete payment to confirm your registration.'
          : 'You are successfully registered! See you at the summit.',
      status: registration.status,
      isWaitlisted,
      isPendingPayment,
      qrCode: qrCodeDataUrl,
      selectedDays: registration.selectedDays,
      totalAmountPaid: registration.totalAmountPaid,
      registration: { _id: registration._id, status: registration.status },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You are already registered for this event.' });
    }
    res.status(500).json({ message: error.message });
  }
};

// ─── Check Registration ───────────────────────────────────────────────────────
// @desc    Check if user is registered for an event
// @route   GET /api/registrations/check/:eventId
const checkRegistration = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({ eventId });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const registration = await Registration.findOne({
      user: req.user._id,
      event: event._id,
      cancelledAt: null,
    });

    if (registration) {
      // If PENDING_PAYMENT, verify the seat hold still exists
      if (registration.status === 'PENDING_PAYMENT') {
        const seatHold = await SeatBooking.findOne({
          eventId: event.eventId,
          userId: req.user._id,
        });
        if (!seatHold) {
          // Hold expired — auto-delete the PENDING_PAYMENT registration to allow re-registration
          await Registration.deleteOne({ _id: registration._id });
          return res.status(200).json({ isRegistered: false });
        }
      }

      return res.status(200).json({
        isRegistered: true,
        status: registration.status,
        qrCode: registration.qrCode || null,
      });
    }

    res.status(200).json({ isRegistered: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get My Registrations ─────────────────────────────────────────────────────
// @desc    Get all registrations for logged-in user
// @route   GET /api/registrations/my
const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ user: req.user._id, cancelledAt: null })
      .populate('event', 'name collegeName city venue dateTime endDateTime status eventId amount')
      .sort({ createdAt: -1 });

    const mySeats = await SeatBooking.find({ userId: req.user._id, status: 'confirmed' }).lean();
    const seatMap = new Map(mySeats.map(s => [s.eventId, s.seatId]));

    const submittedFeedback = await Feedback.find({ studentId: req.user._id }).select('eventId').lean();
    const submittedFeedbackSet = new Set(submittedFeedback.map(item => item.eventId));

    res.status(200).json(
      registrations.map(registration => ({
        ...registration.toObject(),
        hasSubmittedFeedback: submittedFeedbackSet.has(registration.event?.eventId),
        seatNumber: seatMap.get(registration.event?.eventId) || null,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Cleanup Expired Pending Registrations ───────────────────────────────────
// @desc    Remove PENDING_PAYMENT registrations whose seat hold has expired
// @route   POST /api/registrations/cleanup-expired
// Called by frontend when it detects a stale PENDING_PAYMENT state
const cleanupExpiredPending = async (req, res) => {
  try {
    const { eventId } = req.body;
    const event = await Event.findOne({ eventId });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const registration = await Registration.findOne({
      user: req.user._id,
      event: event._id,
      status: 'PENDING_PAYMENT',
      cancelledAt: null,
    });

    if (!registration) {
      return res.status(200).json({ cleaned: false, message: 'No pending registration found' });
    }

    // Check if seat hold still exists
    const seatHold = await SeatBooking.findOne({
      eventId: event.eventId,
      userId: req.user._id,
    });

    if (seatHold) {
      return res.status(200).json({ cleaned: false, message: 'Seat hold still active' });
    }

    // No hold — expired. Delete the pending registration.
    await Registration.deleteOne({ _id: registration._id });

    return res.status(200).json({ cleaned: true, message: 'Expired registration removed. You can now register again.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Cancellation Core ───────────────────────────────────────────────────────

const cancelRegistrationCore = async ({ registrationId, reason, actor }) => {
  const registration = await Registration.findById(registrationId)
    .populate('event')
    .populate('user', 'name email phone');

  if (!registration) {
    const error = new Error('Registration not found.');
    error.statusCode = 404;
    throw error;
  }
  if (!canManageRegistration(actor, registration)) {
    const error = new Error('You are not authorized to cancel this registration.');
    error.statusCode = 403;
    throw error;
  }
  if (!['REGISTERED', 'WAITLISTED', 'PENDING_PAYMENT'].includes(registration.status) || registration.cancelledAt) {
    const error = new Error(`Cannot cancel a registration with status: ${registration.status}.`);
    error.statusCode = 400;
    throw error;
  }

  const event = registration.event;
  if (!event) {
    const error = new Error('Associated event not found.');
    error.statusCode = 404;
    throw error;
  }
  if (event.status !== 'UPCOMING') {
    const error = new Error('Cancellation is only allowed for upcoming events.');
    error.statusCode = 400;
    throw error;
  }
  if (cancellationDeadlinePassed(event)) {
    const error = new Error('Cancellation deadline has passed. Registrations cannot be cancelled on or after the day of the event (after 12:00 AM).');
    error.statusCode = 400;
    throw error;
  }

  const wasRegistered = registration.status === 'REGISTERED';
  const wasPendingPayment = registration.status === 'PENDING_PAYMENT';
  const previousStatus = registration.status;
  const cancelledAt = new Date();

  // Invalidate QR tokens
  await RegistrationToken.updateMany(
    { registrationId: registration._id, used: false },
    { $set: { used: true, usedAt: cancelledAt } }
  );

  if (registration.qrNonce) {
    await denylistNonce({
      nonce: registration.qrNonce,
      registrationId: registration._id,
      studentId: registration.user._id,
      eventId: event._id,
      expiresAt: registration.qrExpiresAt,
      reason: 'CANCELLED',
      metadata: { cancelledAt: cancelledAt.toISOString(), registrationId: registration._id.toString() },
    });
  }

  registration.status = 'CANCELLED';
  registration.cancelledAt = cancelledAt;
  registration.cancellationReason = reason || registration.cancellationReason || 'Cancelled by user';
  registration.cancelledBy = actor._id;
  registration.qrInvalidatedAt = cancelledAt;

  let promoted = null;
  let freedSeatId = null;

  if (wasRegistered || wasPendingPayment) {
    // Find and release any seat held/confirmed by this user
    const existingSeat = await SeatBooking.findOne({ eventId: event.eventId, userId: registration.user._id });
    if (existingSeat) {
      freedSeatId = existingSeat.seatId;
      await SeatBooking.deleteOne({ _id: existingSeat._id });
    }

    // Only process refund if they had actually paid (REGISTERED + razorpay_payment_id)
    const refundAmount = wasRegistered
      ? Math.max(0, ((event.amount || 500) - 100) * ((registration.selectedDays?.length || 1)))
      : 0;

    if (wasRegistered && registration.razorpay_payment_id && refundAmount > 0) {
      if (registration.razorpay_payment_id.startsWith('mock_payment_dev_')) {
        registration.refundStatus = 'PROCESSED';
        registration.razorpay_refund_id = 'mock_refund_dev_' + Date.now();
      } else {
        try {
          const Razorpay = require('razorpay');
          const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
          });
          const refund = await razorpay.payments.refund(registration.razorpay_payment_id, {
            amount: refundAmount * 100,
            notes: { reason: reason || 'User initiated cancellation' }
          });
          registration.refundStatus = 'PROCESSED';
          registration.razorpay_refund_id = refund.id;
        } catch (err) {
          console.error('Razorpay refund failed:', err);
          registration.refundStatus = 'PENDING'; // Will be retried manually
        }
      }
    } else if (wasRegistered) {
      registration.refundStatus = 'NOT_APPLICABLE';
    } else {
      // PENDING_PAYMENT — no payment was made yet
      registration.refundStatus = 'NOT_APPLICABLE';
    }

    if (wasRegistered) {
      event.registeredCount = Math.max(0, (event.registeredCount || 1) - 1);
      // Promote next waitlisted student, assign freed seat
      promoted = await promoteWaitlistedStudent(event, freedSeatId);
    }
  } else {
    // WAITLISTED
    registration.refundStatus = 'NOT_APPLICABLE';
    event.waitlistCount = Math.max(0, (event.waitlistCount || 1) - 1);
  }

  await registration.save();
  await event.save();

  await CancellationAuditLog.create({
    registrationId: registration._id,
    studentId: registration.user._id,
    eventId: event._id,
    cancelledAt,
    cancelledBy: actor._id,
    reason: registration.cancellationReason,
    qrNonce: registration.qrNonce || '',
    previousStatus,
  });

  notifyCancellation({ registration, reason: registration.cancellationReason });
  if (promoted) {
    notifyPromotion({
      promoted: promoted.waitlisted,
      event,
      qrCode: promoted.qrInfo.qrCode,
      assignedSeat: promoted.assignedSeat,
    });
  }

  return {
    registration,
    refundAmount: wasRegistered
      ? Math.max(0, ((event.amount || 500) - 100) * ((registration.selectedDays?.length || 1)))
      : 0,
  };
};

// ─── Cancel Registration ──────────────────────────────────────────────────────
// @desc    Cancel a registration
// @route   DELETE /api/registrations/:registrationId/cancel
const cancelRegistration = async (req, res) => {
  try {
    const result = await cancelRegistrationCore({
      registrationId: req.params.registrationId,
      reason: req.body?.reason,
      actor: req.user,
    });

    res.status(200).json({
      message: result.registration.status === 'CANCELLED'
        ? 'Registration cancelled successfully.'
        : 'Cancellation completed.',
      status: 'CANCELLED',
      refundStatus: result.registration.refundStatus,
      refundAmount: result.refundAmount,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// @desc    Cancel via body payload
// @route   POST /api/registration/cancel
const cancelRegistrationByBody = async (req, res) => {
  try {
    const { registrationId, reason } = req.body;
    if (!registrationId) {
      return res.status(400).json({ message: 'registrationId is required.' });
    }

    const result = await cancelRegistrationCore({
      registrationId,
      reason,
      actor: req.user,
    });

    res.status(200).json({
      message: 'Registration cancelled successfully.',
      registrationId,
      status: 'CANCELLED',
      refundStatus: result.registration.refundStatus,
      refundAmount: result.refundAmount,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = {
  registerForEvent,
  checkRegistration,
  getMyRegistrations,
  cancelRegistration,
  cancelRegistrationByBody,
  cleanupExpiredPending,
};
