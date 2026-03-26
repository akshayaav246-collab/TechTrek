const express = require('express');
const router = express.Router();
const { checkIn, getCheckinStats } = require('../controllers/checkinController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, checkIn);
router.get('/stats/:eventId', protect, getCheckinStats);

module.exports = router;
