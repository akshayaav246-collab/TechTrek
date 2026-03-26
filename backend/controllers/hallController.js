const HallLayout = require('../models/HallLayout');

// GET /api/halls — list all halls (admin)
exports.getHalls = async (req, res) => {
  try {
    const halls = await HallLayout.find().sort({ hall_name: 1 }).lean();
    res.json(halls);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/halls/:id
exports.getHallById = async (req, res) => {
  try {
    const hall = await HallLayout.findById(req.params.id).lean();
    if (!hall) return res.status(404).json({ message: 'Hall not found' });
    res.json(hall);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/halls — create new hall
exports.createHall = async (req, res) => {
  try {
    const {
      hall_name, total_rows, seats_per_row, aisle_after_seat,
      reserved_rows, stage_position, entry_points,
    } = req.body;

    if (!hall_name || !total_rows || !seats_per_row) {
      return res.status(400).json({ message: 'hall_name, total_rows and seats_per_row are required' });
    }

    const hall = await HallLayout.create({
      hall_name, total_rows, seats_per_row,
      aisle_after_seat: aisle_after_seat || [],
      reserved_rows: reserved_rows || [],
      stage_position: stage_position || 'front',
      entry_points: entry_points || 'both',
      createdBy: req.user._id,
    });
    res.status(201).json(hall);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/halls/:id — update hall
exports.updateHall = async (req, res) => {
  try {
    const hall = await HallLayout.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!hall) return res.status(404).json({ message: 'Hall not found' });
    res.json(hall);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/halls/:id
exports.deleteHall = async (req, res) => {
  try {
    const hall = await HallLayout.findByIdAndDelete(req.params.id);
    if (!hall) return res.status(404).json({ message: 'Hall not found' });
    res.json({ message: 'Hall deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
