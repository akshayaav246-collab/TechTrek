const mongoose = require('mongoose');

const speakerSchema = new mongoose.Schema({
  title: { type: String, default: '', trim: true },
  name: { type: String, required: true, trim: true },
  normalizedName: { type: String, required: true, trim: true },
  role: { type: String, default: '', trim: true },
  company: { type: String, default: '', trim: true },
  linkedIn: { type: String, default: '', trim: true },
  bio: { type: String, default: '', trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

speakerSchema.index({ createdBy: 1, normalizedName: 1 }, { unique: true });

module.exports = mongoose.model('Speaker', speakerSchema);
