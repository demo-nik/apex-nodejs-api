const express = require('express');
const { createProfileServiceClient } = require('./profile-service-client');

function createApp({ getProfile = createProfileServiceClient() } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/', (request, response) => {
    response.json({
      name: 'apex-nodejs-api',
      description: 'A small REST API for learning containerized application deployment.',
      status: 'running',
    });
  });

  app.get('/health', (request, response) => {
    response.status(200).json({ status: 'healthy' });
  });

  app.get('/api/profile', async (request, response) => {
    const result = await getProfile();
    if (result.ok) return response.status(200).json(result.profile);
    if (result.kind === 'timeout') return response.status(504).json({ error: 'Profile service timed out' });
    if (result.kind === 'unavailable') return response.status(503).json({ error: 'Profile service is unavailable' });
    return response.status(502).json({ error: 'Profile service request failed' });
  });

  app.use((request, response) => {
    response.status(404).json({ error: 'Not Found' });
  });

  app.use(errorHandler);
  return app;
}

const errorHandler = (error, request, response, next) => {
  if (response.headersSent) return next(error);
  log('error', 'Request failed', { errorName: error.name });
  return response.status(500).json({ error: 'Internal Server Error' });
};

const app = createApp();

function log(level, message, details = {}) {
  const entry = { timestamp: new Date().toISOString(), level, message, ...details };
  const write = level === 'error' ? console.error : console.log;
  write(JSON.stringify(entry));
}

module.exports = { app, createApp, errorHandler, log };
