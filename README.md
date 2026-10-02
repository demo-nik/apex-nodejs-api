# apex-nodejs-api

A small, modular REST API built with Node.js 22 and Express. It is designed as a starting point for learning containerized application deployment and operations.

## Project structure

```text
src/
  app.js       Express application, routes, and error handling
  server.js    HTTP server startup and graceful shutdown
tests/
  app.test.js  HTTP endpoint tests using Node's built-in test runner
Dockerfile    Multi-stage Node 22 Alpine image
```

## Prerequisites

- Node.js 22 or later and npm
- Docker (for container commands)

## Install and run locally

```sh
npm ci
npm start
```

The API listens on port 3000 by default. For automatic restart during local development, use `npm run dev`.

## API endpoints

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/` | Application name, description, and status |
| `GET` | `/health` | `{"status":"healthy"}` with HTTP 200 |

Example root response:

```json
{
  "name": "apex-nodejs-api",
  "description": "A small REST API for learning containerized application deployment.",
  "status": "running"
}
```

Unknown paths return HTTP 404 with `{"error":"Not Found"}`. Unexpected application errors return a generic HTTP 500 response.

## Tests and checks

```sh
npm test
npm run check
```

Tests run locally and do not need AWS credentials or deployed infrastructure.

## Docker

Build and run the production image:

```sh
docker build -t apex-nodejs-api:local .
docker run --rm -p 3000:3000 apex-nodejs-api:local
```

The multi-stage image uses Node 22 Alpine, installs production dependencies, runs as the unprivileged `node` user, and exposes port 3000. The `/health` endpoint is implemented by the Node.js application; it can later be configured as an ECS container health check. The image has no AWS dependencies or credentials.

## Configuration

Copy `.env.example` to `.env` if you use a local environment file loader; the app itself reads values from its process environment.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP listening port |
| `NODE_ENV` | `development` | Runtime environment label used in startup logs |

Do not put credentials or secrets in `.env.example` or commit `.env` files.

## Future ECS learning path

This API is intentionally independent of AWS. Later learning steps can build and tag its Docker image, publish it to ECR, run it as an ECS task and service, add IAM roles and CloudWatch logs, and provision application infrastructure with Terraform. Those integrations and CI/CD workflows are not part of this repository yet.
