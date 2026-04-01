const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  status: {
    type: String,
    enum: ['REGISTERED', 'WAITLISTED', 'CANCELLED', 'CHECKED_IN'],
    default: 'REGISTERED'
  },
  qrCode: { type: String },       // base64 PNG data URL
  secureHash: { type: String },   // HMAC for QR validation
  checkedIn: { type: Boolean, default: false },
  checkedInAt: { type: Date },

  // Multi-day event support
  selectedDays: [{ type: Number }],        // e.g. [1, 3] = attended Day 1 and Day 3
  totalAmountPaid: { type: Number, default: 0 }, // 500 × selectedDays.length

  // Payment tracking (activated once Razorpay is connected)
  razorpayPaymentId: { type: String, default: null }, // stored after successful payment

  // Cancellation tracking
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null },

  // Refund tracking (only for REGISTERED students who paid; WAITLISTED students never pay)
  refundStatus: {
    type: String,
    enum: ['NOT_APPLICABLE', 'PENDING', 'PROCESSED', 'FAILED'],
    default: 'NOT_APPLICABLE'
  },
  refundId: { type: String, default: null }, // Razorpay refund ID
}, { timestamps: true });

// Prevent duplicate registrations
registrationSchema.index({ user: 1, event: 1 }, { unique: true });

const Registration = mongoose.model('Registration', registrationSchema);
module.exports = Registration;
