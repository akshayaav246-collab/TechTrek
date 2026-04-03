const AttendanceScanLog = require('../models/AttendanceScanLog');
const { broadcastAlert } = require('../services/alertService');
const { verifyAdminSession } = require('../services/adminSessionService');

const getIpAddress = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '';
};

const buildAlertPayload = ({ message, req, qrPayload }) => ({
  type: 'security.alert',
  message,
  ipAddress: getIpAddress(req),
  deviceInfo: req.headers['user-agent'] || '',
  qrPayload: qrPayload || '',
  timestamp: new Date().toISOString(),
});

const logUnauthorizedAttempt = async (req, reason) => {
  const qrPayload = req.body?.encryptedQrPayload || '';
  const payload = buildAlertPayload({ message: reason, req, qrPayload });

  await AttendanceScanLog.create({
    status: 'UNAUTHORIZED',
    suspicious: true,
    message: reason,
    qrPayload,
    deviceInfo: payload.deviceInfo,
    ipAddress: payload.ipAddress,
    scannedAt: new Date(payload.timestamp),
    metadata: { route: req.originalUrl },
  });

  broadcastAlert('attendance-alert', payload);
};

const requireAdminSession = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'Admin authorization required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { admin, session } = await verifyAdminSession(token);
    if (!['admin', 'superAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Admin authorization required.' });
    }
    req.admin = admin;
    req.adminSession = session;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Admin session invalid or expired.' });
  }
};

const requireAdminSessionForAttendance = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    await logUnauthorizedAttempt(req, 'Unauthorized attendance scan blocked: missing admin session token.');
    return res.status(403).json({ message: 'Admin authorization required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { admin, session } = await verifyAdminSession(token);
    if (!['admin', 'superAdmin'].includes(admin.role)) {
      await logUnauthorizedAttempt(req, 'Unauthorized attendance scan blocked: non-admin role.');
      return res.status(403).json({ message: 'Admin authorization required.' });
    }
    req.admin = admin;
    req.adminSession = session;
    next();
  } catch (error) {
    await logUnauthorizedAttempt(req, `Unauthorized attendance scan blocked: ${error.message}`);
    return res.status(403).json({ message: 'Admin session invalid or expired.' });
  }
};

module.exports = { requireAdminSession, requireAdminSessionForAttendance, getIpAddress };
