const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const test = require('node:test');
const express = require('express');
const { app, createApp, errorHandler, log } = require('../src/app');
const { createProfileServiceClient, DEFAULT_TIMEOUT_MS } = require('../src/profile-service-client');

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

test('profile client is unavailable when fetch is missing or URL is invalid', async () => {
  assert.deepEqual(await createProfileServiceClient({ serviceUrl: 'http://service', fetchImpl: null })(), {
    ok: false, kind: 'unavailable',
  });
  assert.deepEqual(await createProfileServiceClient({ serviceUrl: 'not a URL' })(), {
    ok: false, kind: 'unavailable',
  });
  assert.deepEqual(await createProfileServiceClient({ serviceUrl: 'ftp://service' })(), {
    ok: false, kind: 'unavailable',
  });
  assert.equal(DEFAULT_TIMEOUT_MS, 2_000);
});

test('profile client requests the fixed path on the configured HTTP base URL', async () => {
  let request;
  const getProfile = createProfileServiceClient({
    serviceUrl: 'https://service.example:8443/some/base?token=secret',
    fetchImpl: async (...args) => {
      request = args;
      return { ok: true, json: async () => ({ id: 'p-1' }) };
    },
  });

  assert.deepEqual(await getProfile(), { ok: true, profile: { id: 'p-1' } });
  assert.equal(String(request[0]), 'https://service.example:8443/api/profile');
  assert.deepEqual(request[1].headers, { accept: 'application/json' });
  assert.ok(request[1].signal instanceof AbortSignal);
});

test('profile client treats malformed JSON and abort errors as failures', async () => {
  const badJson = createProfileServiceClient({
    serviceUrl: 'http://service',
    fetchImpl: async () => ({ ok: true, json: async () => { throw new SyntaxError('bad JSON'); } }),
  });
  assert.deepEqual(await badJson(), { ok: false, kind: 'connection' });

  const aborted = createProfileServiceClient({
    serviceUrl: 'http://service',
    fetchImpl: async () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    },
  });
  assert.deepEqual(await aborted(), { ok: false, kind: 'timeout' });
});

test('GET /api/profile maps unavailable and timeout results to their HTTP statuses', async () => {
  for (const [kind, status, message] of [
    ['unavailable', 503, 'Profile service is unavailable'],
    ['timeout', 504, 'Profile service timed out'],
  ]) {
    await withServer(createApp({ getProfile: async () => ({ ok: false, kind }) }), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/profile`);
      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), { error: message });
    });
  }
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

test('error handler delegates when response headers have already been sent', () => {
  const error = new Error('late failure');
  let forwarded;
  const result = errorHandler(error, {}, { headersSent: true }, (received) => {
    forwarded = received;
    return 'delegated';
  });
  assert.equal(result, 'delegated');
  assert.equal(forwarded, error);
});

test('log writes structured entries at the selected console level', () => {
  const originalLog = console.log;
  const originalError = console.error;
  const entries = [];
  console.log = (entry) => entries.push(JSON.parse(entry));
  console.error = (entry) => entries.push(JSON.parse(entry));
  try {
    log('info', 'started', { port: 3000 });
    log('error', 'failed', { code: 'EADDRINUSE' });
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  assert.equal(entries[0].level, 'info');
  assert.equal(entries[0].port, 3000);
  assert.equal(entries[1].level, 'error');
  assert.equal(entries[1].code, 'EADDRINUSE');
  assert.ok(Number.isFinite(Date.parse(entries[0].timestamp)));
});

test('server starts and shuts down cleanly on SIGTERM', async () => {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '0', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server did not start in time')), 5_000);
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.stdout.on('data', (chunk) => {
      if (output.includes('Server started')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.once('exit', (code) => {
      if (!output.includes('Server started')) {
        clearTimeout(timeout);
        reject(new Error(`Server exited before starting with code ${code}: ${output}`));
      }
    });
  });

  child.kill('SIGTERM');
  const [code, signal] = await new Promise((resolve) => child.once('exit', (exitCode, exitSignal) => {
    resolve([exitCode, exitSignal]);
  }));
  assert.equal(code, 0);
  assert.equal(signal, null);
  assert.match(output, /Server started/);
  assert.match(output, /Server shutting down; stopping new connections/);
  assert.match(output, /Server stopped/);
});
