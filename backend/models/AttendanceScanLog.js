const mongoose = require('mongoose');

const attendanceScanLogSchema = new mongoose.Schema({
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', default: null, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null, index: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  qrNonce: { type: String, default: '', index: true },
  status: {
    type: String,
    enum: ['SUCCESS', 'UNAUTHORIZED', 'INVALID', 'EXPIRED', 'DUPLICATE', 'CANCELLED'],
    required: true,
    index: true,
  },
  suspicious: { type: Boolean, default: false },
  message: { type: String, default: '' },
  qrPayload: { type: String, default: '' },
  deviceInfo: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  scannedAt: { type: Date, required: true, default: Date.now, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

attendanceScanLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'], function immutableLog(next) {
  next(new Error('AttendanceScanLog entries are immutable'));
});

const AttendanceScanLog = mongoose.model('AttendanceScanLog', attendanceScanLogSchema);
module.exports = AttendanceScanLog;
