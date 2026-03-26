const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { generateHash } = require('../utils/qrHelper');

// @desc    Check-in a student via QR code
// @route   POST /api/checkin
const checkIn = async (req, res) => {
  try {
    const { qrPayload } = req.body;

    let payload;
    try {
      payload = typeof qrPayload === 'string' ? JSON.parse(qrPayload) : qrPayload;
    } catch {
      return res.status(400).json({ message: 'Invalid QR code format.' });
    }

    const { userId, eventId, registrationId, secureHash } = payload;

    if (!userId || !eventId || !registrationId || !secureHash) {
      return res.status(400).json({ message: 'Invalid QR code: missing fields.' });
    }

    // Validate HMAC hash
    const expectedHash = generateHash(userId, eventId, registrationId);
    if (expectedHash !== secureHash) {
      return res.status(403).json({ message: '⛔ Invalid QR: Tampered or unauthorized.' });
    }

    // Fetch registration with user and event details
    const registration = await Registration.findById(registrationId)
      .populate('user', 'name email college year discipline')
      .populate('event', 'name venue dateTime checkedInCount registeredCount');

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }

    // Gate: check-in must be started by admin
    const ev = await Event.findById(registration.event._id || registration.event);
    if (!ev || !ev.checkInStarted) {
      return res.status(403).json({ message: 'Check-in has not been started for this event yet. Please wait for the admin to open check-in.' });
    }

    if (registration.checkedIn) {
      return res.status(400).json({
        message: 'Already Checked-In',
        alreadyCheckedIn: true,
        studentName: registration.user.name,
        eventName: registration.event.name,
        checkedInAt: registration.checkedInAt,
      });
    }

    // Perform check-in
    registration.checkedIn = true;
    registration.checkedInAt = new Date();
    registration.status = 'CHECKED_IN';
    await registration.save();

    // Increment event's checkedInCount
    await Event.findByIdAndUpdate(eventId, { $inc: { checkedInCount: 1 } });

    res.status(200).json({
      message: 'Check-In Successful!',
      studentName: registration.user.name,
      studentEmail: registration.user.email,
      college: registration.user.college,
      eventName: registration.event.name,
      checkedInAt: registration.checkedInAt,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get live check-in stats for an event
// @route   GET /api/checkin/stats/:eventId
const getCheckinStats = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    res.status(200).json({
      eventName: event.name,
      registeredCount: event.registeredCount,
      checkedInCount: event.checkedInCount,
      remaining: event.registeredCount - event.checkedInCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { checkIn, getCheckinStats };
