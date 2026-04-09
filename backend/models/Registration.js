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
    enum: ['REGISTERED', 'WAITLISTED', 'CANCELLED', 'CHECKED_IN', 'PENDING_PAYMENT'],
    default: 'REGISTERED'
  },
  qrCode: { type: String },       // base64 PNG data URL
  qrEncryptedPayload: { type: String, default: null },
  qrNonce: { type: String, default: null, index: true },
  qrIssuedAt: { type: Date, default: null },
  qrExpiresAt: { type: Date, default: null },
  qrInvalidatedAt: { type: Date, default: null },
  secureHash: { type: String },   // HMAC for QR validation
  checkedIn: { type: Boolean, default: false },
  checkedInAt: { type: Date },

  // Multi-day event support
  selectedDays: [{ type: Number }],        // e.g. [1, 3] = attended Day 1 and Day 3
  totalAmountPaid: { type: Number, default: 0 }, // 500 × selectedDays.length

  // Payment tracking (activated once Razorpay is connected)
  razorpayPaymentId: { type: String, default: null }, // stored after successful payment
  razorpay_order_id: { type: String, default: null },
  razorpay_payment_id: { type: String, default: null },
  razorpay_signature: { type: String, default: null },

  // Cancellation tracking
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Refund tracking (only for REGISTERED students who paid; WAITLISTED students never pay)
  refundStatus: {
    type: String,
    enum: ['NOT_APPLICABLE', 'PENDING', 'PROCESSED', 'FAILED'],
    default: 'NOT_APPLICABLE'
  },
  razorpay_refund_id: { type: String, default: null },
  refundId: { type: String, default: null }, // Razorpay refund ID

  // Certificate and Feedback tracking
  certificate_status: {
    type: String,
    enum: ['not_started', 'generating', 'ready', 'failed'],
    default: 'not_started'
  },
  certificate_url: { type: String },
  feedback_submitted: { type: Boolean, default: false },
  // Human readable Ticket ID (e.g. TT-20260127-ABC123)
  ticketId: { type: String, unique: true, sparse: true }
}, { timestamps: true });

// Prevent duplicate registrations
registrationSchema.index({ user: 1, event: 1 }, { unique: true, partialFilterExpression: { cancelledAt: null } });
registrationSchema.index({ event: 1, cancelledAt: 1, status: 1 });

const Registration = mongoose.model('Registration', registrationSchema);
module.exports = Registration;
