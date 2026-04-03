const Razorpay = require('razorpay');
const crypto = require('crypto');
const Registration = require('../models/Registration');
const SeatBooking = require('../models/SeatBooking');

exports.createOrder = async (req, res) => {
  try {
    const { amount, eventId } = req.body;
    if (!amount || !eventId) {
      return res.status(400).json({ message: 'Amount and Event ID are required' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, // amount in paisa
      currency: 'INR',
      receipt: `rcpt_${req.user._id}_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    if (!order) {
      return res.status(500).json({ message: 'Razorpay order creation failed' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, eventId, seatId } = req.body;
    
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed: Invalid signature' });
    }

    // Payment is valid. Update Seat status and Registration.
    const booking = await SeatBooking.findOne({
      eventId, seatId, userId: req.user._id, status: 'temp_hold',
    });
    
    if (!booking) {
      return res.status(404).json({ message: 'Active seat hold not found or expired' });
    }

    booking.status = 'confirmed';
    booking.expiresAt = null;
    await booking.save();

    const registration = await Registration.findOne({ event: booking.eventId, user: req.user._id, cancelledAt: null });
    if (registration) {
      registration.razorpay_order_id = razorpay_order_id;
      registration.razorpay_payment_id = razorpay_payment_id;
      registration.razorpay_signature = razorpay_signature;
      await registration.save();
    }

    res.json({ message: 'Payment successful and seat confirmed', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
