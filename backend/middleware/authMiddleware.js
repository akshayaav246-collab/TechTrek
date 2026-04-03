const jwt = require('jsonwebtoken');
const { verifyAdminSession } = require('../services/adminSessionService');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.kind === 'admin-session') {
          throw new Error('Admin session token');
        }
        const User = require('../models/User');
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return res.status(401).json({ message: 'User not found' });
        if (!user.isActive) return res.status(403).json({ message: 'Account is deactivated' });
        req.user = user;
        return next();
      } catch (jwtError) {
        const { admin, session } = await verifyAdminSession(token);
        req.user = admin;
        req.admin = admin;
        req.adminSession = session;
        return next();
      }
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Restrict to specific roles
const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: `Access denied. Required role: ${roles.join(' or ')}` });
  }
  next();
};

module.exports = { protect, authorizeRoles };
