const mongoose = require('mongoose');

const cancellationAuditLogSchema = new mongoose.Schema({
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  cancelledAt: { type: Date, required: true, index: true },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, default: '' },
  qrNonce: { type: String, default: '', index: true },
  previousStatus: { type: String, required: true },
}, { timestamps: true });

cancellationAuditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'], function immutableLog(next) {
  next(new Error('CancellationAuditLog entries are immutable'));
});

const CancellationAuditLog = mongoose.model('CancellationAuditLog', cancellationAuditLogSchema);
module.exports = CancellationAuditLog;
