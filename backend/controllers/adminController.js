const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AdminSession = require('../models/AdminSession');
const { addClient, removeClient } = require('../services/alertService');
const { issueAdminSession, verifyAdminSession } = require('../services/adminSessionService');
const { getIpAddress } = require('../middleware/adminSessionMiddleware');

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated.' });
    }
    if (!['admin', 'superAdmin'].includes(user.role)) {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    const { token, expiresAt } = await issueAdminSession({
      user,
      ipAddress: getIpAddress(req),
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
      expiresAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const adminLogout = async (req, res) => {
  try {
    if (req.adminSession) {
      req.adminSession.revokedAt = new Date();
      await req.adminSession.save();
    }
    res.json({ message: 'Admin session revoked.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminMe = async (req, res) => {
  res.json({
    _id: req.admin._id,
    name: req.admin.name,
    email: req.admin.email,
    role: req.admin.role,
    expiresAt: req.adminSession?.expiresAt || null,
  });
};

const streamAlerts = async (req, res) => {
  try {
    const token = req.query.token || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) {
      return res.status(403).json({ message: 'Admin authorization required.' });
    }

    const { admin } = await verifyAdminSession(token);
    if (!['admin', 'superAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Admin authorization required.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    addClient(res);

    const heartbeat = setInterval(() => {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      removeClient(res);
    });
  } catch (error) {
    res.status(403).json({ message: 'Admin session invalid or expired.' });
  }
};

const revokeExpiredSessions = async () => {
  await AdminSession.updateMany(
    { expiresAt: { $lte: new Date() }, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
};

module.exports = { adminLogin, adminLogout, getAdminMe, streamAlerts, revokeExpiredSessions };