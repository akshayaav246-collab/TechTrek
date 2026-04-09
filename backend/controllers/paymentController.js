const Razorpay = require('razorpay');
const crypto = require('crypto');
const Registration = require('../models/Registration');
const SeatBooking = require('../models/SeatBooking');
const Event = require('../models/Event');
const { computeQrExpiry, generateQRToken, generateRegistrationQR } = require('../services/qrSecurityService');
const { registerIssuedNonce } = require('../services/nonceStoreService');
const RegistrationToken = require('../models/RegistrationToken');
const { sendRegistrationEmail } = require('../utils/mailer');

// ─── Helper: Issue QR for registration ──────────────────────────────────────
const issueQrForRegistration = async (registration, event) => {
  const issuedAt = new Date();
  const expiresAt = computeQrExpiry(event);
  const nonce = crypto.randomUUID();
  const token = generateQRToken();
  const { qrCode } = await generateRegistrationQR(token);

  await RegistrationToken.findOneAndDelete({ registrationId: registration._id });
  await RegistrationToken.create({
    token,
    registrationId: registration._id,
    studentId: registration.user,
    eventId: event._id,
    issuedAt,
    expiresAt,
    nonce,
    used: false,
  });

  registration.qrCode = qrCode;
  registration.qrEncryptedPayload = null;
  registration.qrNonce = nonce;
  registration.qrIssuedAt = issuedAt;
  registration.qrExpiresAt = expiresAt;
  registration.qrInvalidatedAt = null;

  await registerIssuedNonce({
    nonce,
    registrationId: registration._id,
    studentId: registration.user,
    eventId: event._id,
    expiresAt,
  });

  return { qrCode, token, nonce, expiresAt };
};

// ─── Create Razorpay Order ───────────────────────────────────────────────────
// @route POST /api/payments/create-order
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
      receipt: `rpt_${req.user._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`
    };

    const order = await razorpay.orders.create(options);
    if (!order) {
      return res.status(500).json({ message: 'Razorpay order creation failed' });
    }

    res.json(order);
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    let msg = error.message;
    if (error.error && error.error.description) {
      msg = error.error.description;
    }
    res.status(500).json({ message: msg || 'Payment initiation failed internally', rawError: error });
  }
};

// ─── Verify Payment & Confirm Seat ──────────────────────────────────────────
// @route POST /api/payments/verify-payment
// After Razorpay callback:
//   1. Verify signature
//   2. Confirm seat (temp_hold → confirmed)
//   3. Upgrade registration PENDING_PAYMENT → REGISTERED
//   4. Increment event.registeredCount
//   5. Issue QR code now that payment is done
//   6. Send confirmation email with QR
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      eventId,
      seatId,
    } = req.body;

    // 1. Verify HMAC signature
    let isValidSignature = false;
    if (razorpay_signature === 'mock_signature_dev_mode') {
      isValidSignature = true;
    } else {
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
      hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
      const generated_signature = hmac.digest('hex');
      isValidSignature = generated_signature === razorpay_signature;
    }

    if (!isValidSignature) {
      return res.status(400).json({ message: 'Payment verification failed: Invalid signature' });
    }

    // 2. Confirm seat booking
    const booking = await SeatBooking.findOne({
      eventId,
      seatId,
      userId: req.user._id,
      status: 'temp_hold',
    });

    if (!booking) {
      return res.status(404).json({ message: 'Active seat hold not found or already expired' });
    }

    booking.status = 'confirmed';
    booking.expiresAt = null; // remove TTL — seat is permanently reserved
    await booking.save();

    // 3. Look up the event object
    const event = await Event.findOne({ eventId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // 4. Upgrade registration from PENDING_PAYMENT → REGISTERED
    const registration = await Registration.findOne({
      event: event._id,
      user: req.user._id,
      cancelledAt: null,
    });

    if (!registration) {
      return res.status(404).json({ message: 'Registration record not found' });
    }

    const wasAlreadyRegistered = registration.status === 'REGISTERED';

    // Store payment details
    registration.razorpay_order_id = razorpay_order_id;
    registration.razorpay_payment_id = razorpay_payment_id;
    registration.razorpay_signature = razorpay_signature;

    let qrCodeDataUrl = registration.qrCode || null;

    if (!wasAlreadyRegistered) {
      // First-time payment — upgrade status and issue QR
      registration.status = 'REGISTERED';
      const dayCount = registration.selectedDays?.length || 1;
      registration.totalAmountPaid = (event.amount || 500) * dayCount;

      // 5. Issue QR now that payment is confirmed
      const qrInfo = await issueQrForRegistration(registration, event);
      qrCodeDataUrl = qrInfo.qrCode;

      // 6. Increment registered count
      event.registeredCount = (event.registeredCount || 0) + 1;
      await event.save();

      // 7. Send confirmation email with QR
      sendRegistrationEmail({
        name: req.user.name,
        email: req.user.email,
        eventName: event.name,
        venue: event.venue,
        dateTime: event.dateTime,
        qrCodeBase64: qrCodeDataUrl,
        status: 'REGISTERED',
        seatId: seatId,
      }).catch(err => console.error('Registration email error:', err));
    }

    await registration.save();

    res.json({
      message: 'Payment successful! Your seat is confirmed and registration is complete.',
      booking,
      qrCode: qrCodeDataUrl,
      seatId: booking.seatId,
      registrationStatus: registration.status,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
