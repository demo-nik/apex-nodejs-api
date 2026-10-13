const express = require('express');

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

app.use((request, response) => {
  response.status(404).json({ error: 'Not Found' });
});

const errorHandler = (error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  log('error', 'Request failed', { errorName: error.name });
  response.status(500).json({ error: 'Internal Server Error' });
};
app.use(errorHandler);

function log(level, message, details = {}) {
  const entry = { timestamp: new Date().toISOString(), level, message, ...details };
  const write = level === 'error' ? console.error : console.log;
  write(JSON.stringify(entry));
}

module.exports = { app, errorHandler, log };
