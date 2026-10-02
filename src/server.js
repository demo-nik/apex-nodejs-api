const { app, log } = require('./app');

const port = Number.parseInt(process.env.PORT || '3000', 10);
const server = app.listen(port, () => {
  log('info', 'Server started', { port, environment: process.env.NODE_ENV || 'development' });
});

server.on('error', (error) => {
  log('error', 'Server failed to start', { message: error.message });
  process.exitCode = 1;
});

let shuttingDown = false;
const shutdownTimeoutMs = 10_000;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log('info', 'Server shutting down; stopping new connections', { signal });

  const shutdownTimeout = setTimeout(() => {
    log('error', 'Server shutdown timed out; forcing remaining connections closed', {
      timeoutMs: shutdownTimeoutMs,
    });
    server.closeAllConnections();
  }, shutdownTimeoutMs);

  server.close((error) => {
    clearTimeout(shutdownTimeout);
    if (error) {
      log('error', 'Server shutdown failed', { message: error.message });
      process.exitCode = 1;
      return;
    }
    log('info', 'Server stopped');
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
