const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getSeats, holdSeat, confirmSeat, releaseSeat } = require('../controllers/seatController');

router.get('/:eventId', getSeats);                      // public — get all seat states
router.post('/hold', protect, holdSeat);                // student — hold a seat
router.post('/confirm', protect, confirmSeat);          // student — confirm payment
router.delete('/release', protect, releaseSeat);        // student — release hold

module.exports = router;
