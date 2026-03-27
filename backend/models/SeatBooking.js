const mongoose = require('mongoose');

const seatBookingSchema = new mongoose.Schema({
  eventId: { type: String, required: true },           // e.g. 'evt-001'
  seatId:  { type: String, required: true },           // e.g. 'A5'
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:  { type: String, enum: ['temp_hold', 'confirmed'], default: 'temp_hold' },
  expiresAt: { type: Date, default: null },             // null = never expires (confirmed)
  reminderSent: { type: Boolean, default: false },
}, { timestamps: true });

// Compound unique index — one booking per seat per event
seatBookingSchema.index({ eventId: 1, seatId: 1 }, { unique: true });

// TTL index: MongoDB auto-deletes temp_hold docs when expiresAt passes
seatBookingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

const SeatBooking = mongoose.model('SeatBooking', seatBookingSchema);
module.exports = SeatBooking;
