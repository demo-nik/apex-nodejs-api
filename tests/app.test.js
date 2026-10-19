const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const { app, createApp, errorHandler } = require('../src/app');
const { createProfileServiceClient } = require('../src/profile-service-client');

async function withServer(application, run) {
  const server = application.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('GET / returns application information', async () => {
  await withServer(app, async (baseUrl) => {
    const response = await fetch(baseUrl);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      name: 'apex-nodejs-api',
      description: 'A small REST API for learning containerized application deployment.',
      status: 'running',
    });
  });
});

test('GET /health returns a lightweight healthy response', async () => {
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'healthy' });
  });
});

test('GET /api/profile forwards the downstream profile response', async () => {
  const getProfile = createProfileServiceClient({
    serviceUrl: 'http://mock-profile:3000',
    fetchImpl: async (url, options) => {
      assert.equal(String(url), 'http://mock-profile:3000/api/profile');
      assert.ok(options.signal);
      return { ok: true, json: async () => ({ id: 'sample-profile-001', name: 'Alex Example' }) };
    },
  });
  await withServer(createApp({ getProfile }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/profile`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { id: 'sample-profile-001', name: 'Alex Example' });
  });
});

test('GET /api/profile maps downstream connection failures to a generic 502', async () => {
  const getProfile = createProfileServiceClient({
    serviceUrl: 'http://mock-profile:3000',
    fetchImpl: async () => { throw new TypeError('private host and credentials must not leak'); },
  });
  await withServer(createApp({ getProfile }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/profile`);
    const body = await response.text();
    assert.equal(response.status, 502);
    assert.equal(body, '{"error":"Profile service request failed"}');
    assert.equal(body.includes('private host'), false);
  });
});

test('GET /api/profile maps downstream non-success responses to a generic 502', async () => {
  const getProfile = createProfileServiceClient({
    serviceUrl: 'http://mock-profile:3000',
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });
  await withServer(createApp({ getProfile }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/profile`);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: 'Profile service request failed' });
  });
});

test('GET /api/profile maps a timed out downstream request to 504', async () => {
  const getProfile = createProfileServiceClient({
    serviceUrl: 'http://mock-profile:3000',
    timeoutMs: 10,
    fetchImpl: (_url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }),
  });
  await withServer(createApp({ getProfile }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/profile`);
    assert.equal(response.status, 504);
    assert.deepEqual(await response.json(), { error: 'Profile service timed out' });
  });
});

test('GET /api/profile fails safely when PROFILE_SERVICE_URL is missing', async () => {
  const getProfile = createProfileServiceClient({ serviceUrl: '' });
  await withServer(createApp({ getProfile }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/profile`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Profile service is unavailable' });
  });
});

test('unknown routes return JSON 404', async () => {
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/missing`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Not Found' });
  });
});

test('unexpected errors return a generic 500 response without stack details', async () => {
  const failingApp = express();
  failingApp.get('/fail', () => { throw new Error('sensitive internal detail'); });
  failingApp.use(errorHandler);

  await withServer(failingApp, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/fail`);
    const body = await response.text();
    assert.equal(response.status, 500);
    assert.equal(body, '{"error":"Internal Server Error"}');
    assert.equal(body.includes('sensitive'), false);
  });
});
