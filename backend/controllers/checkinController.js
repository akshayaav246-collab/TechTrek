const Registration = require('../models/Registration');
const RegistrationToken = require('../models/RegistrationToken');
const Event = require('../models/Event');
const AttendanceScanLog = require('../models/AttendanceScanLog');
const { extractQRToken } = require('../services/qrSecurityService');
const { verifyQRToken } = require('./verificationController');
const { getNonceState, markNonceUsed } = require('../services/nonceStoreService');
const { broadcastAlert } = require('../services/alertService');
const { getIpAddress } = require('../middleware/adminSessionMiddleware');
const { generateCertificateInBackground } = require('../services/certificateService');

const buildRequestContext = (req) => ({
  deviceInfo: req.headers['user-agent'] || '',
  ipAddress: getIpAddress(req),
});

const logAttendanceAttempt = async ({
  status,
  message,
  req,
  qrPayload,
  registration,
  adminId,
  qrNonce,
  suspicious = false,
  metadata = {},
}) => {
  const context = buildRequestContext(req);
  await AttendanceScanLog.create({
    registrationId: registration?._id || null,
    studentId: registration?.user?._id || registration?.user || null,
    eventId: registration?.event?._id || registration?.event || null,
    adminId: adminId || null,
    qrNonce: qrNonce || registration?.qrNonce || '',
    status,
    suspicious,
    message,
    qrPayload: qrPayload || '',
    deviceInfo: context.deviceInfo,
    ipAddress: context.ipAddress,
    scannedAt: new Date(),
    metadata,
  });
};

// @desc    Check-in a student via thin QR token
// @route   POST /api/attendance/checkin
const checkIn = async (req, res) => {
  const { encryptedQrPayload } = req.body;
  if (!encryptedQrPayload) {
    return res.status(400).json({ message: 'QR payload is required.' });
  }

  let qrToken;
  let tokenRecord;
  try {
    qrToken = extractQRToken(encryptedQrPayload);
    tokenRecord = await RegistrationToken.findOne({ token: qrToken }).lean();
    if (!tokenRecord) {
      throw new Error('Invalid QR code');
    }
    if (tokenRecord.used === true) {
      throw new Error('QR already used');
    }
    if (Date.now() > new Date(tokenRecord.expiresAt).getTime()) {
      throw new Error('QR expired');
    }
  } catch (error) {
    await logAttendanceAttempt({
      status: error.message === 'QR already used' ? 'DUPLICATE' : error.message === 'QR expired' ? 'EXPIRED' : 'INVALID',
      message:
        error.message === 'QR already used'
          ? 'Duplicate QR scan detected.'
          : error.message === 'QR expired'
            ? 'QR code has expired.'
            : 'Invalid QR payload.',
      req,
      qrPayload: encryptedQrPayload,
      adminId: req.admin?._id,
      suspicious: true,
      metadata: { error: error.message, token: qrToken || '' },
    });
    if (error.message === 'QR already used') {
      return res.status(409).json({ message: 'Duplicate QR scan detected.', alreadyCheckedIn: true });
    }
    if (error.message === 'QR expired') {
      return res.status(400).json({ message: 'QR code has expired.' });
    }
    return res.status(400).json({ message: 'Invalid QR payload.' });
  }

  const { registrationId, nonce, expiresAt } = tokenRecord;
  const expiresAtDate = new Date(expiresAt);

  const registration = await Registration.findById(registrationId)
    .populate('user', 'name email college year discipline')
    .populate('event', 'name venue dateTime checkedInCount registeredCount checkInStarted');

  if (!registration) {
    await logAttendanceAttempt({
      status: 'INVALID',
      message: 'Registration not found.',
      req,
      qrPayload: encryptedQrPayload,
      adminId: req.admin._id,
      qrNonce: nonce,
      suspicious: true,
    });
    return res.status(404).json({ message: 'Registration not found.' });
  }

  if (registration.cancelledAt || registration.status === 'CANCELLED') {
    await logAttendanceAttempt({
      status: 'CANCELLED',
      message: 'Registration cancelled. Check-in not permitted.',
      req,
      qrPayload: encryptedQrPayload,
      registration,
      adminId: req.admin._id,
      qrNonce: nonce,
      suspicious: true,
    });
    return res.status(410).json({ message: 'Registration cancelled. Check-in not permitted.' });
  }

  const event = await Event.findById(registration.event._id || registration.event);
  if (!event || !event.checkInStarted) {
    return res.status(403).json({ message: 'Check-in has not been started for this event yet. Please wait for the admin to open check-in.' });
  }

  const nonceState = await getNonceState(nonce);
  if (nonceState?.status === 'DENYLISTED') {
    await logAttendanceAttempt({
      status: 'CANCELLED',
      message: 'Registration cancelled. Check-in not permitted.',
      req,
      qrPayload: encryptedQrPayload,
      registration,
      adminId: req.admin._id,
      qrNonce: nonce,
      suspicious: true,
      metadata: { reason: nonceState.reason },
    });
    return res.status(410).json({ message: 'Registration cancelled. Check-in not permitted.' });
  }

  try {
    await verifyQRToken(qrToken);
  } catch (error) {
    await logAttendanceAttempt({
      status: error.message === 'QR already used' ? 'DUPLICATE' : error.message === 'QR expired' ? 'EXPIRED' : 'INVALID',
      message:
        error.message === 'QR already used'
          ? 'Duplicate QR scan detected.'
          : error.message === 'QR expired'
            ? 'QR code has expired.'
            : 'Invalid QR payload.',
      req,
      qrPayload: encryptedQrPayload,
      registration,
      adminId: req.admin._id,
      qrNonce: nonce,
      suspicious: true,
      metadata: { error: error.message, token: qrToken },
    });
    if (error.message === 'QR already used') {
      return res.status(409).json({
        message: 'Duplicate QR scan detected.',
        alreadyCheckedIn: true,
        studentName: registration.user.name,
        eventName: registration.event.name,
        checkedInAt: registration.checkedInAt,
      });
    }
    if (error.message === 'QR expired') {
      return res.status(400).json({ message: 'QR code has expired.' });
    }
    return res.status(400).json({ message: 'Invalid QR payload.' });
  }

  const useResult = await markNonceUsed({
    nonce,
    registrationId: registration._id,
    studentId: registration.user._id || registration.user,
    eventId: event._id,
    expiresAt: registration.qrExpiresAt || expiresAtDate,
    metadata: { adminId: req.admin._id.toString() },
  });

  if (!useResult.ok) {
    if (qrToken) await RegistrationToken.updateOne({ token: qrToken }, { $set: { used: false, usedAt: null } });

    await logAttendanceAttempt({
      status: useResult.state?.status === 'DENYLISTED' ? 'CANCELLED' : 'DUPLICATE',
      message: useResult.state?.status === 'DENYLISTED'
        ? 'Registration cancelled. Check-in not permitted.'
        : 'Duplicate QR scan detected.',
      req,
      qrPayload: encryptedQrPayload,
      registration,
      adminId: req.admin._id,
      qrNonce: nonce,
      suspicious: true,
      metadata: { nonceState: useResult.state, token: qrToken || '' },
    });

    if (useResult.state?.status === 'DENYLISTED') {
      return res.status(410).json({ message: 'Registration cancelled. Check-in not permitted.' });
    }

    broadcastAlert('attendance-alert', {
      type: 'attendance.duplicate',
      message: `Duplicate scan flagged for ${registration.user.name}.`,
      studentName: registration.user.name,
      eventName: registration.event.name,
      timestamp: new Date().toISOString(),
    });

    return res.status(409).json({
      message: 'Duplicate QR scan detected.',
      alreadyCheckedIn: true,
      studentName: registration.user.name,
      eventName: registration.event.name,
      checkedInAt: registration.checkedInAt,
    });
  }

  if (!registration.checkedIn) {
    registration.checkedIn = true;
    registration.checkedInAt = new Date();
    registration.status = 'CHECKED_IN';
    await registration.save();
    await Event.findByIdAndUpdate(event._id, { $inc: { checkedInCount: 1 } });
    
    // Trigger certificate generation in background
    generateCertificateInBackground(registration._id).catch(err => {
      console.error('Background certificate generation failed:', err);
    });
  }

  const context = buildRequestContext(req);
  await logAttendanceAttempt({
    status: 'SUCCESS',
    message: 'Check-In Successful!',
    req,
    qrPayload: encryptedQrPayload,
    registration,
    adminId: req.admin._id,
    qrNonce: nonce,
    metadata: {
      scannedAt: registration.checkedInAt,
      deviceInfo: context.deviceInfo,
      ipAddress: context.ipAddress,
    },
  });

  broadcastAlert('attendance-alert', {
    type: 'attendance.success',
    message: `Check-in successful for ${registration.user.name}.`,
    registrationId: registration._id,
    eventId: event.eventId,
    eventName: registration.event.name,
    studentName: registration.user.name,
    checkedInAt: registration.checkedInAt,
    timestamp: new Date().toISOString(),
  });

  res.status(200).json({
    message: 'Check-In Successful!',
    studentName: registration.user.name,
    studentEmail: registration.user.email,
    college: registration.user.college,
    eventName: registration.event.name,
    checkedInAt: registration.checkedInAt,
  });
};

// @desc    Get live check-in stats for an event
// @route   GET /api/checkin/stats/:eventId
const getCheckinStats = async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const activeRegistered = await Registration.countDocuments({
      event: event._id,
      cancelledAt: null,
      status: { $in: ['REGISTERED', 'CHECKED_IN'] },
    });

    res.status(200).json({
      eventName: event.name,
      registeredCount: activeRegistered,
      checkedInCount: event.checkedInCount,
      remaining: Math.max(0, activeRegistered - event.checkedInCount),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { checkIn, getCheckinStats };
