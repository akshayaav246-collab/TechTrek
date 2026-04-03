const clients = new Set();

const sendEvent = (res, event, payload) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const addClient = (res) => {
  clients.add(res);
  sendEvent(res, 'connected', { ok: true, timestamp: new Date().toISOString() });
};

const removeClient = (res) => {
  clients.delete(res);
};

const broadcastAlert = (event, payload) => {
  for (const client of clients) {
    sendEvent(client, event, payload);
  }
};

module.exports = { addClient, removeClient, broadcastAlert };
