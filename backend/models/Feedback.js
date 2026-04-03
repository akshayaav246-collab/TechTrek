const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  eventId: { type: String, required: true }, // Referencing the custom Event ID
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true },
  college: { type: String },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  isApprovedForLanding: { type: Boolean, default: false },
  isApprovedForEventPage: { type: Boolean, default: false },
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);
module.exports = Feedback;
