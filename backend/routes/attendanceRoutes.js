const express = require('express');
const { checkIn } = require('../controllers/checkinController');
const { requireAdminSessionForAttendance } = require('../middleware/adminSessionMiddleware');

const router = express.Router();

router.post('/checkin', requireAdminSessionForAttendance, checkIn);

module.exports = router;
