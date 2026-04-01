const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');
const { generateHash, generateQRCode } = require('../utils/qrHelper');
const { sendRegistrationEmail } = require('../utils/mailer');

// @desc    Register user for an event
// @route   POST /api/registrations
const registerForEvent = async (req, res) => {
  try {
    const { eventId, selectedDays } = req.body;  // selectedDays optional, for multi-day events
    const user = req.user;

    const event = await Event.findOne({ eventId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Domain validation
    const userDomain = user.email.split('@')[1];
    if (userDomain !== event.collegeDomain && event.collegeDomain !== 'ALL') {
      return res.status(403).json({
        message: `The event is for ${event.collegeName} students`
      });
    }

    // Duplicate check
    const existingRegistration = await Registration.findOne({ user: user._id, event: event._id });
    if (existingRegistration) {
      return res.status(400).json({ message: 'You are already registered or waitlisted for this event.' });
    }

    // Seat capacity check
    let status = 'REGISTERED';
    if (event.registeredCount >= event.capacity) {
      status = 'WAITLISTED';
      event.waitlistCount = (event.waitlistCount || 0) + 1;
      await event.save();
    } else {
      event.registeredCount += 1;
      await event.save();
    }

    // Multi-day event support: compute selected days & amount
    const isMultiDay = Array.isArray(event.days) && event.days.length > 0;
    const validDays = isMultiDay && Array.isArray(selectedDays) && selectedDays.length > 0
      ? selectedDays.filter(d => event.days.some(ed => ed.day === d))
      : [];
    const dayCount = validDays.length || 1;
    const perDayAmount = event.amount || 500;
    const totalAmount = isMultiDay ? perDayAmount * dayCount : perDayAmount;

    // Create registration first to get _id
    const registration = await Registration.create({
      user: user._id,
      event: event._id,
      status,
      selectedDays: isMultiDay ? validDays : [],
      totalAmountPaid: status === 'REGISTERED' ? totalAmount : 0,
    });

    // Generate QR code only for REGISTERED (not waitlisted)
    let qrCodeDataUrl = null;
    if (status === 'REGISTERED') {
      const secureHash = generateHash(user._id.toString(), event._id.toString(), registration._id.toString());
      const qrPayload = {
        userId: user._id,
        eventId: event._id,
        registrationId: registration._id,
        timestamp: Date.now(),
        secureHash,
        // Multi-day: include which days were selected
        ...(isMultiDay && validDays.length > 0 && {
          selectedDays: validDays,
          totalAmountPaid: totalAmount,
        }),
      };
      qrCodeDataUrl = await generateQRCode(qrPayload);
      registration.qrCode = qrCodeDataUrl;
      registration.secureHash = secureHash;
      await registration.save();
    }

    // Send email asynchronously (don't block response)
    sendRegistrationEmail({
      name: user.name,
      email: user.email,
      eventName: event.name,
      venue: event.venue,
      dateTime: event.dateTime,
      qrCodeBase64: qrCodeDataUrl,
      status,
    }).catch(err => console.error('Email send error:', err));

    const isWaitlisted = status === 'WAITLISTED';
    res.status(201).json({
      message: isWaitlisted
        ? 'This event is full. You have been added to the waitlist.'
        : 'You are successfully registered! See you at the summit.',
      status: registration.status,
      isWaitlisted,
      qrCode: qrCodeDataUrl,
      selectedDays: registration.selectedDays,
      totalAmountPaid: registration.totalAmountPaid,
      registration: { _id: registration._id, status: registration.status }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You are already registered for this event.' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check if user is registered for an event
// @route   GET /api/registrations/check/:eventId
const checkRegistration = async (req, res) => {
  try {
    const { eventId } = req.params;
    const user = req.user;

    const event = await Event.findOne({ eventId });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const registration = await Registration.findOne({ user: user._id, event: event._id });

    if (registration) {
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

// @desc    Get all registrations for logged-in user (profile page)
// @route   GET /api/registrations/my
const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ user: req.user._id })
      .populate('event', 'name collegeName city venue dateTime endDateTime status eventId amount')
      .sort({ createdAt: -1 });

    const submittedFeedback = await Feedback.find({ studentId: req.user._id })
      .select('eventId')
      .lean();

    const submittedFeedbackSet = new Set(submittedFeedback.map(item => item.eventId));

    res.status(200).json(
      registrations.map(registration => ({
        ...registration.toObject(),
        hasSubmittedFeedback: submittedFeedbackSet.has(registration.event?.eventId),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel a registration
// @route   DELETE /api/registrations/:registrationId/cancel
const cancelRegistration = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const user = req.user;

    // Fetch the registration and populate event
    const registration = await Registration.findById(registrationId).populate('event');
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }

    // Ensure it belongs to the requesting user
    if (registration.user.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to cancel this registration.' });
    }

    // Can only cancel REGISTERED or WAITLISTED
    if (!['REGISTERED', 'WAITLISTED'].includes(registration.status)) {
      return res.status(400).json({ message: `Cannot cancel a registration with status: ${registration.status}.` });
    }

    const event = registration.event;
    if (!event) {
      return res.status(404).json({ message: 'Associated event not found.' });
    }

    // Policy: event must be UPCOMING
    if (event.status !== 'UPCOMING') {
      return res.status(400).json({ message: 'Cancellation is only allowed for upcoming events.' });
    }

    // Policy: cancellation must be before 12:00 AM (midnight) on the event day
    const eventDate = new Date(event.dateTime);
    const deadline = new Date(eventDate);
    deadline.setHours(0, 0, 0, 0); // midnight = start of the event day
    const now = new Date();
    if (now >= deadline) {
      return res.status(400).json({
        message: 'Cancellation deadline has passed. Registrations cannot be cancelled on or after the day of the event (after 12:00 AM).'
      });
    }

    const wasRegistered = registration.status === 'REGISTERED';
    const wasWaitlisted = registration.status === 'WAITLISTED';
    const eventAmount = event.amount || 500;
    const cancellationFee = 100;
    // Multi-day: refund = (500 - 100) * number of days selected
    const dayCount = registration.selectedDays && registration.selectedDays.length > 0
      ? registration.selectedDays.length : 1;
    const refundAmount = Math.max(0, (eventAmount - cancellationFee) * dayCount);  // ₹400 × days

    // Mark as cancelled
    registration.status = 'CANCELLED';
    registration.cancelledAt = new Date();

    if (wasRegistered) {
      // Registered students paid → issue refund (or mark pending until Razorpay is live)
      registration.refundStatus = 'PENDING'; // will be updated to PROCESSED by Razorpay webhook

      // TODO: When Razorpay is connected, uncomment the block below:
      // const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
      // if (registration.razorpayPaymentId) {
      //   try {
      //     const refund = await razorpay.payments.refund(registration.razorpayPaymentId, { amount: refundAmount * 100 });
      //     registration.refundId = refund.id;
      //     registration.refundStatus = 'PROCESSED';
      //   } catch (err) {
      //     console.error('Razorpay refund error:', err);
      //     registration.refundStatus = 'FAILED';
      //   }
      // }

      // Free seat if one was booked
      const SeatBooking = require('../models/SeatBooking');
      await SeatBooking.deleteOne({ eventId: event.eventId, userId: user._id });

      // Decrement registered count
      event.registeredCount = Math.max(0, (event.registeredCount || 1) - 1);

      // Promote first waitlisted student (if any)
      const SeatBookingModel = require('../models/SeatBooking'); // already imported above, harmless
      const waitlisted = await Registration.findOne({ event: event._id, status: 'WAITLISTED' }).sort({ createdAt: 1 });
      if (waitlisted) {
        waitlisted.status = 'REGISTERED';
        // Generate QR for promoted student
        const { generateHash, generateQRCode } = require('../utils/qrHelper');
        const secureHash = generateHash(waitlisted.user.toString(), event._id.toString(), waitlisted._id.toString());
        const qrPayload = {
          userId: waitlisted.user,
          eventId: event._id,
          registrationId: waitlisted._id,
          timestamp: Date.now(),
          secureHash,
        };
        waitlisted.qrCode = await generateQRCode(qrPayload);
        waitlisted.secureHash = secureHash;
        await waitlisted.save();
        event.registeredCount = (event.registeredCount || 0) + 1;
        event.waitlistCount = Math.max(0, (event.waitlistCount || 1) - 1);
      }

    } else if (wasWaitlisted) {
      // Waitlisted students never paid → no refund needed
      registration.refundStatus = 'NOT_APPLICABLE';
      event.waitlistCount = Math.max(0, (event.waitlistCount || 1) - 1);
    }

    await registration.save();
    await event.save();

    res.status(200).json({
      message: wasRegistered
        ? `Registration cancelled. A refund of ₹${refundAmount} (after ₹${cancellationFee} fee per day) will be processed to your original payment method within 5–7 business days.`
        : 'Waitlist entry cancelled successfully.',
      status: 'CANCELLED',
      refundStatus: registration.refundStatus,
      refundAmount: wasRegistered ? refundAmount : 0,
      cancellationFee: wasRegistered ? cancellationFee * dayCount : 0,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerForEvent, checkRegistration, getMyRegistrations, cancelRegistration };
