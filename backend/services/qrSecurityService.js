const crypto = require('crypto');
const QRCode = require('qrcode');

const computeQrExpiry = (event) => {
  const base = event?.endDateTime ? new Date(event.endDateTime) : event?.dateTime ? new Date(event.dateTime) : new Date();
  if (Number.isNaN(base.getTime())) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  const oneHourAfterEvent = new Date(base.getTime() + 60 * 60 * 1000);
  return oneHourAfterEvent > new Date() ? oneHourAfterEvent : new Date(Date.now() + 24 * 60 * 60 * 1000);
};

const generateQRToken = () => crypto.randomBytes(16).toString('hex');

const buildVerificationUrl = (token) => {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return `${appUrl}/verify/${token}`;
};

const generateRegistrationQR = async (token) => {
  const verificationUrl = buildVerificationUrl(token);
  const qrCode = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 400,
    margin: 2,
    color: {
      dark: '#0E1B3D',
      light: '#FAF8F4',
    },
  });

  return { token, verificationUrl, qrCode };
};

const extractQRToken = (rawValue) => {
  const value = String(rawValue || '').trim();
  if (!value) {
    throw new Error('QR token is required.');
  }

  const match = value.match(/^[a-f0-9]{32}$/i);
  if (match) return match[0];

  try {
    const parsed = new URL(value);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length >= 2 && segments[segments.length - 2] === 'verify') {
      return segments[segments.length - 1];
    }
  } catch {}

  throw new Error('Malformed QR payload');
};

module.exports = { computeQrExpiry, generateQRToken, generateRegistrationQR, extractQRToken };
