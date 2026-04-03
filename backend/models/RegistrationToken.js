const mongoose = require('mongoose');

const registrationTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  issuedAt: { type: Date, required: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  nonce: { type: String, required: true, index: true },
  used: { type: Boolean, default: false, index: true },
  usedAt: { type: Date, default: null },
}, { timestamps: true });

registrationTokenSchema.index({ registrationId: 1, token: 1 });

const RegistrationToken = mongoose.model('RegistrationToken', registrationTokenSchema);
module.exports = RegistrationToken;
