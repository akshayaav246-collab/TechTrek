require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Registration = require('../models/Registration');
const RegistrationToken = require('../models/RegistrationToken');
const QrNonce = require('../models/QrNonce');
const AdminSession = require('../models/AdminSession');
const AttendanceScanLog = require('../models/AttendanceScanLog');
const CancellationAuditLog = require('../models/CancellationAuditLog');
const Event = require('../models/Event');
const { computeQrExpiry, generateQRToken, generateRegistrationQR } = require('../services/qrSecurityService');
const { registerIssuedNonce } = require('../services/nonceStoreService');

async function run() {
  await connectDB();

  await Promise.all([
    Registration.syncIndexes(),
    RegistrationToken.syncIndexes(),
    QrNonce.syncIndexes(),
    AdminSession.syncIndexes(),
    AttendanceScanLog.syncIndexes(),
    CancellationAuditLog.syncIndexes(),
    Event.syncIndexes(),
  ]);

  const registrations = await Registration.find({
    status: { $in: ['REGISTERED', 'CHECKED_IN'] },
    $or: [
      { qrNonce: { $exists: false } },
      { qrNonce: null },
      { qrCode: { $exists: false } },
      { qrCode: null },
    ],
  }).populate('event');

  for (const registration of registrations) {
    const event = registration.event;
    if (!event) continue;

    const issuedAt = new Date();
    const expiresAt = computeQrExpiry(event);
    const nonce = require('crypto').randomUUID();
    const token = generateQRToken();
    const { qrCode } = await generateRegistrationQR(token);

    registration.qrCode = qrCode;
    registration.qrEncryptedPayload = null;
    registration.qrNonce = nonce;
    registration.qrIssuedAt = issuedAt;
    registration.qrExpiresAt = expiresAt;
    await registration.save();

    await RegistrationToken.findOneAndDelete({ registrationId: registration._id });
    await RegistrationToken.create({
      token,
      registrationId: registration._id,
      studentId: registration.user,
      eventId: event._id,
      issuedAt,
      expiresAt,
      nonce,
      used: registration.status === 'CHECKED_IN',
      usedAt: registration.status === 'CHECKED_IN' ? (registration.checkedInAt || issuedAt) : null,
    });

    await registerIssuedNonce({
      nonce,
      registrationId: registration._id,
      studentId: registration.user,
      eventId: event._id,
      expiresAt,
      metadata: { reason: 'MIGRATED' },
    });
  }

  console.log(`Migrated ${registrations.length} registrations to thin QR payloads.`);
  await mongoose.connection.close();
}

run().catch(async (error) => {
  console.error('Migration failed:', error);
  await mongoose.connection.close();
  process.exit(1);
});
