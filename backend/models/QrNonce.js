const mongoose = require('mongoose');

const qrNonceSchema = new mongoose.Schema({
  nonce: { type: String, required: true, unique: true, index: true },
  registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', default: null, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null, index: true },
  status: {
    type: String,
    enum: ['ACTIVE', 'USED', 'DENYLISTED'],
    default: 'ACTIVE',
    index: true,
  },
  reason: {
    type: String,
    enum: ['ISSUED', 'CHECKED_IN', 'CANCELLED', 'DUPLICATE_ATTEMPT', 'MIGRATED', 'UNKNOWN'],
    default: 'ISSUED',
  },
  expiresAt: { type: Date, default: null, index: true },
  usedAt: { type: Date, default: null },
  invalidatedAt: { type: Date, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

const QrNonce = mongoose.model('QrNonce', qrNonceSchema);
module.exports = QrNonce;
