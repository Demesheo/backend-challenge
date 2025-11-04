const fastify = require('fastify')({ logger: true });
const listenMock = require('../mock-server');
const throttler = require('../middlewares/throttle');
const config = require('../config');

listenMock();

fastify.addHook('onRequest', throttler);

let failureLog = [];

function addFailure() {
  const now = Date.now();
  failureLog.push(now);
  failureLog = failureLog.filter(ts => now - ts <= config.retry.windowSeconds * 1000);
  return failureLog.length >= config.retry.maxFailures;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

fastify.get('/getUsers', async (req, reply) => {
  try {
    const resp = await fetch(`${config.mockServerBaseUrl}/getUsers`);
    const data = await resp.json();
    reply.send(data);
  } catch (err) {
    reply.status(500).send({ error: 'Failed to fetch users', message: err.message });
  }
});

fastify.get('/getEvents', async (req, reply) => {
  try {
    const resp = await fetch(`${config.mockServerBaseUrl}/getEvents`);
    const data = await resp.json();
    reply.send(data);
  } catch (err) {
    reply.status(500).send({ error: 'Failed to fetch events', message: err.message });
  }
});

fastify.get('/getEventsByUserId/:id', async (req, reply) => {
  try {
    const userResp = await fetch(`${config.mockServerBaseUrl}/getUserById/${req.params.id}`);
    const userData = await userResp.json();
    if (!userData || !userData.events) {
      return reply.status(404).send({ error: 'User not found or no events' });
    }

    const events = await Promise.all(
      userData.events.map(eid =>
        fetch(`${config.mockServerBaseUrl}/getEventById/${eid}`).then(r => r.json())
      )
    );

    reply.send({ userId: req.params.id, total: userData.events.length, events });
  } catch (err) {
    reply.status(500).send({ error: 'Failed to fetch events for user', message: err.message });
  }
});

fastify.post('/addEvent', async (req, reply) => {
  try {
    if (addFailure()) await wait(config.retry.backoffMs);

    const payload = { id: Date.now(), ...req.body };
    const resp = await fetch(`${config.mockServerBaseUrl}/addEvent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!data.success) addFailure();

    reply.status(data.success ? 200 : resp.status).send(data);
  } catch (err) {
    addFailure();
    reply.status(500).send({ error: 'Failed to add event', message: err.message });
  }
});

fastify.listen({ port: config.server.port || 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Server running at ${address}`);
});
