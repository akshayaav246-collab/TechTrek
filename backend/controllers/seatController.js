const SeatBooking = require('../models/SeatBooking');

// GET /api/seats/:eventId — all seat statuses for an event (public)
exports.getSeats = async (req, res) => {
  try {
    const seats = await SeatBooking.find({ eventId: req.params.eventId })
      .select('seatId userId status expiresAt')
      .lean();
    res.json(seats);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/seats/hold — hold a seat for 30 mins
exports.holdSeat = async (req, res) => {
  const { eventId, seatId } = req.body;
  if (!eventId || !seatId) return res.status(400).json({ message: 'eventId and seatId required' });

  try {
    // Check if already held / confirmed by another user
    const existing = await SeatBooking.findOne({ eventId, seatId });
    if (existing) {
      if (existing.userId.toString() === req.user._id.toString()) {
        return res.status(409).json({ message: 'You already hold this seat', booking: existing });
      }
      return res.status(409).json({ message: 'Seat is already taken' });
    }

    // Release any other holds by this user on this event (1 seat at a time)
    await SeatBooking.deleteMany({ eventId, userId: req.user._id, status: 'temp_hold' });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins
    const booking = await SeatBooking.create({
      eventId, seatId,
      userId: req.user._id,
      status: 'temp_hold',
      expiresAt,
    });
    res.status(201).json(booking);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Seat just taken — please choose another' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/seats/confirm — confirm/pay for a held seat
exports.confirmSeat = async (req, res) => {
  const { eventId, seatId } = req.body;
  try {
    const booking = await SeatBooking.findOne({
      eventId, seatId, userId: req.user._id, status: 'temp_hold',
    });
    if (!booking) return res.status(404).json({ message: 'No active hold found for this seat' });

    booking.status = 'confirmed';
    booking.expiresAt = null; // remove TTL — permanently blocked
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/seats/release — manually release user's temp hold
exports.releaseSeat = async (req, res) => {
  const { eventId, seatId } = req.body;
  try {
    const result = await SeatBooking.deleteOne({
      eventId, seatId, userId: req.user._id, status: 'temp_hold',
    });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'No hold to release' });
    res.json({ message: 'Seat released' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
