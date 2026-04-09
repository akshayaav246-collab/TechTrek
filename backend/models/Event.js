const mongoose = require('mongoose');

const agendaItemSchema = new mongoose.Schema({
  time: String,
  title: String,
  duration: String,
  speaker: String,
}, { _id: false });

const dayScheduleSchema = new mongoose.Schema({
  day: { type: Number, required: true },   // 1, 2, 3…
  label: { type: String },                  // "Day 1 – Inauguration", optional
  agenda: [agendaItemSchema],
}, { _id: false });

const eventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  collegeName: { type: String, required: true },
  collegeDomain: { type: String, required: true },
  city: { type: String, required: true },
  venue: { type: String, required: true },
  dateTime: { type: Date, required: true },
  endDateTime: { type: Date, default: null }, // for multi-day events
  capacity: { type: Number, required: true },
  registeredCount: { type: Number, default: 0 },
  waitlistCount: { type: Number, default: 0 },
  checkedInCount: { type: Number, default: 0 },
  status: { type: String, enum: ['UPCOMING', 'COMPLETED'], default: 'UPCOMING' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String },
  topics: [{ type: String }],
  speakers: [{ title: String, name: String, role: String, company: String, linkedIn: String, bio: String, headline: String, tags: [String], date: String, duration: String, image: String }],
  // Single-day agenda (legacy / simple events)
  agenda: [agendaItemSchema],
  // Multi-day agenda: if days.length > 0, the frontend shows Day 1 / Day 2 tabs
  days: [dayScheduleSchema],
  hallLayout: { type: require('mongoose').Schema.Types.ObjectId, ref: 'HallLayout', default: null },
  checkInStarted: { type: Boolean, default: false },
  amount: { type: Number, default: 0 },
  photos: [{ type: String }],
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
