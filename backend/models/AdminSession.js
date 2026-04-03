const mongoose = require('mongoose');

const adminSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'superAdmin'], required: true },
  issuedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: true },
  revokedAt: { type: Date, default: null },
  lastSeenAt: { type: Date, default: null },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

adminSessionSchema.index({ admin: 1, expiresAt: 1 });

const AdminSession = mongoose.model('AdminSession', adminSessionSchema);
module.exports = AdminSession;
