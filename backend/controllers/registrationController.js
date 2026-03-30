const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');
const { generateHash, generateQRCode } = require('../utils/qrHelper');
const { sendRegistrationEmail } = require('../utils/mailer');

// @desc    Register user for an event
// @route   POST /api/registrations
const registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.body;
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

    // Create registration first to get _id
    const registration = await Registration.create({ user: user._id, event: event._id, status });

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
      .populate('event', 'name collegeName city venue dateTime status eventId')
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

module.exports = { registerForEvent, checkRegistration, getMyRegistrations };
