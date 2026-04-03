const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const AdminSession = require('../models/AdminSession');

const SESSION_TTL_HOURS = 8;

const getAdminSessionSecret = () => process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const issueAdminSession = async ({ user, ipAddress, userAgent }) => {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  const sessionId = crypto.randomUUID();

  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role, sessionId, kind: 'admin-session' },
    getAdminSessionSecret(),
    { algorithm: 'HS256', expiresIn: `${SESSION_TTL_HOURS}h` }
  );

  await AdminSession.create({
    sessionId,
    admin: user._id,
    tokenHash: hashToken(token),
    role: user.role,
    issuedAt,
    expiresAt,
    ipAddress,
    userAgent,
  });

  return { token, expiresAt };
};

const verifyAdminSession = async (token) => {
  const decoded = jwt.verify(token, getAdminSessionSecret());
  if (decoded.kind !== 'admin-session') {
    throw new Error('Invalid admin session');
  }

  const session = await AdminSession.findOne({ sessionId: decoded.sessionId }).populate('admin');
  if (!session || session.revokedAt) {
    throw new Error('Admin session revoked');
  }
  if (session.expiresAt <= new Date()) {
    throw new Error('Admin session expired');
  }
  if (session.tokenHash !== hashToken(token)) {
    throw new Error('Admin session mismatch');
  }
  if (!session.admin || !session.admin.isActive) {
    throw new Error('Admin account inactive');
  }
  if (!['admin', 'superAdmin'].includes(session.admin.role)) {
    throw new Error('Admin role required');
  }

  session.lastSeenAt = new Date();
  await session.save();

  return { decoded, session, admin: session.admin };
};

module.exports = { SESSION_TTL_HOURS, issueAdminSession, verifyAdminSession };
