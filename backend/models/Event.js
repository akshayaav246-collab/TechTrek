const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true }, // e.g. evt-001
  name: { type: String, required: true },
  collegeName: { type: String, required: true },
  collegeDomain: { type: String, required: true }, // e.g. ksrce.ac.in
  city: { type: String, required: true },
  venue: { type: String, required: true },
  dateTime: { type: Date, required: true },
  capacity: { type: Number, required: true },
  registeredCount: { type: Number, default: 0 },
  waitlistCount: { type: Number, default: 0 },
  checkedInCount: { type: Number, default: 0 },
  status: { type: String, enum: ['UPCOMING', 'COMPLETED'], default: 'UPCOMING' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String },
  topics: [{ type: String }],
  speakers: [{
    name: String,
    role: String,
    company: String,
    bio: String
  }],
  agenda: [{ time: String, title: String, duration: String, speaker: String }],
  hallLayout: { type: require('mongoose').Schema.Types.ObjectId, ref: 'HallLayout', default: null },
  checkInStarted: { type: Boolean, default: false },
  amount: { type: Number, default: 0 }, // registration fee (0 = free)
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
