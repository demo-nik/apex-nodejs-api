const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const { app, errorHandler } = require('../src/app');

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
