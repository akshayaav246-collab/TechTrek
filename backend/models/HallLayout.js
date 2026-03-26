const mongoose = require('mongoose');

const hallLayoutSchema = new mongoose.Schema({
  hall_name: { type: String, required: true },
  total_rows: { type: Number, required: true, min: 1, max: 52 },
  seats_per_row: { type: Number, required: true, min: 1 },
  aisle_after_seat: { type: [Number], default: [] },     // e.g. [5, 10]
  reserved_rows: { type: [String], default: [] },         // e.g. ['A', 'B']
  stage_position: { type: String, enum: ['front', 'back'], default: 'front' },
  entry_points: { type: String, enum: ['left', 'right', 'both'], default: 'both' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const HallLayout = mongoose.model('HallLayout', hallLayoutSchema);
module.exports = HallLayout;
