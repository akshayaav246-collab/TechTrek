const express = require('express');
const router = express.Router();
const { downloadCertificate } = require('../controllers/certificateController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:registrationId/download', protect, downloadCertificate);

module.exports = router;
