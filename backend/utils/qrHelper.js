const crypto = require('crypto');
const QRCode = require('qrcode');

/**
 * Generate a secure HMAC hash for a registration
 */
const generateHash = (userId, eventId, registrationId) => {
  const secret = process.env.JWT_SECRET;
  return crypto
    .createHmac('sha256', secret)
    .update(`${userId}:${eventId}:${registrationId}`)
    .digest('hex');
};

/**
 * Generate QR code as a base64 PNG data URL
 */
const generateQRCode = async (payload) => {
  const data = JSON.stringify(payload);
  return await QRCode.toDataURL(data, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 400,
    margin: 2,
    color: {
      dark: '#0E1B3D',
      light: '#FAF8F4',
    },
  });
};

module.exports = { generateHash, generateQRCode };
