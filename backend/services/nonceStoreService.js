const { createClient } = require('redis');
const QrNonce = require('../models/QrNonce');

let redisClientPromise = null;

const getRedisClient = async () => {
  if (!process.env.REDIS_URL) return null;
  if (!redisClientPromise) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (error) => console.error('Redis error:', error.message));
    redisClientPromise = client.connect()
      .then(() => client)
      .catch((error) => {
        console.error('Redis connection failed:', error.message);
        redisClientPromise = null;
        return null;
      });
  }
  return redisClientPromise;
};

const keyForNonce = (nonce) => `attendance:nonce:${nonce}`;

const setRedisValue = async (nonce, value, expiresAt) => {
  const client = await getRedisClient();
  if (!client) return;
  const ttlSeconds = expiresAt ? Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)) : null;
  if (ttlSeconds) {
    await client.set(keyForNonce(nonce), JSON.stringify(value), { EX: ttlSeconds });
    return;
  }
  await client.set(keyForNonce(nonce), JSON.stringify(value));
};

const getNonceState = async (nonce) => {
  const client = await getRedisClient();
  if (client) {
    const cached = await client.get(keyForNonce(nonce));
    if (cached) return JSON.parse(cached);
  }

  const record = await QrNonce.findOne({ nonce }).lean();
  if (!record) return null;
  return {
    nonce: record.nonce,
    status: record.status,
    reason: record.reason,
    expiresAt: record.expiresAt,
    registration: record.registration,
  };
};

const registerIssuedNonce = async ({ nonce, registrationId, studentId, eventId, expiresAt, metadata = {} }) => {
  await QrNonce.findOneAndUpdate(
    { nonce },
    {
      $set: {
        registration: registrationId,
        studentId,
        eventId,
        status: 'ACTIVE',
        reason: metadata.reason || 'ISSUED',
        expiresAt,
        metadata,
      },
    },
    { upsert: true, new: true }
  );

  await setRedisValue(nonce, { nonce, status: 'ACTIVE', reason: metadata.reason || 'ISSUED', expiresAt, registration: registrationId }, expiresAt);
};

const denylistNonce = async ({ nonce, registrationId, studentId, eventId, expiresAt, reason, metadata = {} }) => {
  await QrNonce.findOneAndUpdate(
    { nonce },
    {
      $set: {
        registration: registrationId || null,
        studentId: studentId || null,
        eventId: eventId || null,
        status: 'DENYLISTED',
        reason: reason || 'UNKNOWN',
        invalidatedAt: new Date(),
        expiresAt: expiresAt || null,
        metadata,
      },
    },
    { upsert: true, new: true }
  );

  await setRedisValue(nonce, { nonce, status: 'DENYLISTED', reason: reason || 'UNKNOWN', expiresAt, registration: registrationId || null }, expiresAt);
};

const markNonceUsed = async ({ nonce, registrationId, studentId, eventId, expiresAt, metadata = {} }) => {
  const now = new Date();
  const existing = await QrNonce.findOne({ nonce }).lean();

  if (!existing) {
    await QrNonce.create({
      nonce,
      registration: registrationId || null,
      studentId: studentId || null,
      eventId: eventId || null,
      status: 'USED',
      reason: 'CHECKED_IN',
      usedAt: now,
      expiresAt: expiresAt || null,
      metadata,
    });

    await setRedisValue(
      nonce,
      { nonce, status: 'USED', reason: 'CHECKED_IN', expiresAt, registration: registrationId || null },
      expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );

    return { ok: true };
  }

  if (existing.status !== 'ACTIVE') {
    return {
      ok: false,
      state: { nonce, status: existing.status, reason: existing.reason, expiresAt: existing.expiresAt, registration: existing.registration },
    };
  }

  const transition = await QrNonce.findOneAndUpdate(
    {
      nonce,
      status: 'ACTIVE',
    },
    {
      $set: {
        registration: registrationId || null,
        studentId: studentId || null,
        eventId: eventId || null,
        status: 'USED',
        reason: 'CHECKED_IN',
        usedAt: now,
        expiresAt: expiresAt || null,
        metadata,
      },
    },
    { new: true }
  );

  if (!transition || transition.status !== 'USED') {
    const current = await getNonceState(nonce);
    return { ok: false, state: current };
  }

  await setRedisValue(
    nonce,
    { nonce, status: 'USED', reason: 'CHECKED_IN', expiresAt, registration: registrationId || null },
    expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );

  return { ok: true };
};

module.exports = { getRedisClient, getNonceState, registerIssuedNonce, denylistNonce, markNonceUsed };
