# apex-nodejs-api

A small REST API built with Node.js 22 and Express. Its `/api/profile` route calls the independent `secure-profile-service` app using `PROFILE_SERVICE_URL`.

## Repository structure

```text
apex-nodejs-api/                   Existing API repository
  src/
    app.js                         Express app and routes
    profile-service-client.js      Timed downstream HTTP client
    server.js                      Server startup and graceful shutdown
  tests/app.test.js                API tests with mocked downstream calls
  Dockerfile                       API container image
secure-profile-service/            Separate app at ~/aws_proj/secure-profile-service
  app.js, server.js                Service routes and server lifecycle
  tests/app.test.js                Service endpoint tests
  Dockerfile                       Independent service container image
  README.md                        Service configuration and AWS design
```

## Run locally

In one terminal, run the service on port 3001:

```sh
cd ~/aws_proj/secure-profile-service
npm ci
PORT=3001 npm start
```

In another terminal, start the API with the service URL configured:

```sh
cd ~/aws_proj/apex-nodejs-api
npm ci
PROFILE_SERVICE_URL=http://localhost:3001 npm start
```

The API listens on port 3000 by default. `PROFILE_SERVICE_URL` is configuration; no Cloud Map name is hardcoded. Both apps can run without AWS credentials or actual secrets.

Test the integration and health endpoints:

```sh
curl http://localhost:3000/api/profile
curl http://localhost:3001/health
```

The API's downstream request has a two-second timeout and no retries. It returns generic HTTP 503 when the service URL is missing, 504 on timeout, and 502 on connection or downstream errors.

## API endpoints

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/` | Application name, description, and status |
| `GET` | `/health` | `{"status":"healthy"}` with HTTP 200 |
| `GET` | `/api/profile` | Fictional profile data returned by `secure-profile-service` |

## Tests and checks

```sh
cd ~/aws_proj/apex-nodejs-api
npm test
npm run check

cd ~/aws_proj/secure-profile-service
npm test
npm run check
```

The API tests mock the downstream service and require no AWS account or running microservice.

## Docker

Build each image from its own app directory:

```sh
cd ~/aws_proj/apex-nodejs-api
docker build -t apex-nodejs-api:local .

cd ~/aws_proj/secure-profile-service
docker build -t secure-profile-service:local .
```

Run both containers on a shared Docker network so the API can resolve the service container name:

```sh
docker network create apex-local
docker run -d --rm --name secure-profile-service --network apex-local secure-profile-service:local
docker run --rm --network apex-local -p 3000:3000 \
  -e PROFILE_SERVICE_URL=http://secure-profile-service:3000 \
  apex-nodejs-api:local
```

The service image listens on container port 3000 and includes a `/health` container health check. Both images run as the unprivileged `node` user and need no AWS credentials.

## Configuration and secrets

The API uses `PORT` (default `3000`), `NODE_ENV` (default `development`), and `PROFILE_SERVICE_URL` (unset by default). The independent service uses `PORT`, `NODE_ENV`, `DB_PASSWORD`, `THIRD_PARTY_API_KEY`, and `JWT_SIGNING_SECRET`. Its `.env.example` contains placeholders only; it does not load `.env` automatically. Each app ignores real `.env` files in its own folder.

`GET /health` remains healthy when secret variables are absent. The service's `/api/secure-data` mock requires all three secret variables to be present and returns only generic status; it never returns or logs secret values. JWT secret material is for token signing and verification only, never for returning to clients. No real database, paid API, or AWS Secrets Manager integration is implemented yet.

## Future AWS Secrets Manager, ECS, and Cloud Map design

This work creates no AWS resources and does not change Terraform-managed infrastructure. For production, store `DB_PASSWORD`, `THIRD_PARTY_API_KEY`, and `JWT_SIGNING_SECRET` in AWS Secrets Manager and inject only the needed values into the microservice's separate ECS task definition. Give the ECS task execution role only the required `secretsmanager:GetSecretValue` permission, and ensure its permissions boundary allows that action. If using a customer-managed KMS key, the role also needs `kms:Decrypt` for that key. Secret updates may require starting new ECS tasks to receive injected values.

Keep application runtime secrets out of GitHub Actions unless a specific CI/CD step needs one. Never put secret values in Terraform, task definition JSON, source code, Docker images, or Git.

Future deployment steps for `secure-profile-service`:

1. Build and push its image to ECR.
2. Create a separate ECS task definition and deploy a separate ECS service.
3. Register that service with AWS Cloud Map private DNS service discovery.
4. Configure security groups so API tasks can reach the service on its container port.
5. Set `PROFILE_SERVICE_URL` to the actual private Cloud Map DNS name and port. `http://secure-profile-service:3000` is only an example; use the hostname matching the configured private namespace and service name.
6. Verify calls privately inside the VPC.
7. Keep the microservice private, without a public IP or direct internet exposure.

The current CI workflow builds and deploys only the API image. Add separate deployment configuration for the microservice when its AWS deployment is implemented.
