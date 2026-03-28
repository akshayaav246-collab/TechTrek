const express = require('express');
const router = express.Router();
const { signup, login, getMe, forgotPassword, verifyOtp, resetPassword, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);

module.exports = router;

