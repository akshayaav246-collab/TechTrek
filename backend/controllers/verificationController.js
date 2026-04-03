const RegistrationToken = require('../models/RegistrationToken');

const verifyQRToken = async (token) => {
  const record = await RegistrationToken.findOne({ token }).lean();

  if (!record) {
    throw new Error('Invalid QR code');
  }

  if (record.used === true) {
    throw new Error('QR already used');
  }

  if (Date.now() > new Date(record.expiresAt).getTime()) {
    throw new Error('QR expired');
  }

  const usedAt = new Date();
  const updated = await RegistrationToken.findOneAndUpdate(
    { token, used: false },
    { $set: { used: true, usedAt } },
    { new: true }
  ).lean();

  if (!updated) {
    throw new Error('QR already used');
  }

  return {
    studentId: updated.studentId,
    eventId: updated.eventId,
    registrationId: updated.registrationId,
    nonce: updated.nonce,
    issuedAt: updated.issuedAt,
    expiresAt: updated.expiresAt,
  };
};

module.exports = { verifyQRToken };
