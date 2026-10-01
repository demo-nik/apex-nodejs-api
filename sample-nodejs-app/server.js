const express = require("express");
const { Worker } = require("worker_threads");

const app = express();
const PORT = 3000;

let workers = [];

// Health check
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Start CPU workers
app.get("/cpu/start", (req, res) => {
  if (workers.length > 0) {
    return res.send(`CPU load already running with ${workers.length} worker(s)`);
  }

  // Start 2 CPU workers
  for (let i = 0; i < 2; i++) {
    const worker = new Worker(`
      const { parentPort } = require("worker_threads");

      while (true) {
        Math.sqrt(Math.random() * 1000000);
      }
    `, { eval: true });

    workers.push(worker);
  }

  res.send("CPU load started");
});

// Stop CPU workers
app.get("/cpu/stop", (req, res) => {
  workers.forEach(worker => worker.terminate());
  workers = [];

  res.send("CPU load stopped");
});

// CPU status
app.get("/cpu/status", (req, res) => {
  res.send(`CPU workers running: ${workers.length}`);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
