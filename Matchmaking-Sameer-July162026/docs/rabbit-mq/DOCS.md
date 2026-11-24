# Docker RabbitMQ Documentation

## Overview

This folder contains a Docker Compose setup for running:

- **RabbitMQ** as the message broker
- **api-service** as the Node.js application that connects to RabbitMQ

The setup is intended for local development and testing. RabbitMQ is exposed with the management UI, and the API service is connected to the same Docker network.

## Project Structure

- `docker-compose.yml` - Defines the RabbitMQ and API containers
- `Dockerfile` - Builds the `api-service` image
- `.env` - Stores runtime configuration and secrets
- `rabbitmq.conf/` - RabbitMQ configuration directory
- `data/` - Role-based JSON data files used by the service
- `rabbit_functions/` - Helper scripts for queue and user management
- `index.js` - Main Node.js application entry point
- `test-connection.js` - Utility for checking connectivity
- `README.md` - Quick setup and usage guide
- `DOCS.md` - Detailed technical documentation

## Services

### RabbitMQ

- Image: `rabbitmq:3-management`
- Container name: `rabbitmq`
- Hostname: `rabbitmq`
- Ports:
  - `5672:5672` for AMQP
  - `15672:15672` for the RabbitMQ Management UI
- Storage:
  - Uses the named volume `rabbitmq_data` for persistent broker data
- Health check:
  - Runs `rabbitmq-diagnostics -q check_running`
- Restart policy:
  - `unless-stopped`

### api-service

- Built from the local `Dockerfile`
- Container name: `api-service`
- Port:
  - `3002:3002`
- Mounts:
  - `.:/usr/src/app` for live code syncing during development
  - `/usr/src/app/node_modules` to preserve container dependencies
- Startup dependency:
  - Waits for RabbitMQ to become healthy before starting
- Restart policy:
  - `unless-stopped`

## Docker Compose Network and Volume

### Network

Both services run on the `rabbitmq-net` bridge network. This keeps internal communication isolated from other containers and host services.

### Volume

The `rabbitmq_data` volume stores RabbitMQ state on disk so queues and broker data survive container restarts.

## Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set the required values, including:
   - RabbitMQ credentials
   - API keys or service secrets
   - Any application-specific configuration

3. Start the stack:
   ```bash
   docker-compose up --build
   ```

4. Start in detached mode if needed:
   ```bash
   docker-compose up --build -d
   ```

## Common URLs

- RabbitMQ Management UI: http://localhost:15672
- API service: http://localhost:3002

## Management Commands

Stop the stack:

```bash
docker-compose down
```

View logs:

```bash
docker-compose logs -f
```

Inspect running containers:

```bash
docker-compose ps
```

## Notes

- `docker-compose.yml` uses `depends_on` with `condition: service_healthy`, so RabbitMQ must pass its health check before `api-service` starts.
- The RabbitMQ container keeps its initial credentials in the persistent volume. If credentials change later, the volume may need to be reset.
- The management UI is available because the `rabbitmq:3-management` image is used.

## Troubleshooting

### ACCESS-REFUSED

If RabbitMQ rejects the login after changing credentials in `.env`, reset the broker state:

```bash
docker-compose down
docker volume rm docker-rabbitmq_rabbitmq_data
docker-compose up --build
```

### Port Already in Use

If ports `3002`, `5672`, or `15672` are already occupied, stop the conflicting service or change the mappings in `docker-compose.yml`.

### Container Fails to Start

Check the logs for both services:

```bash
docker-compose logs -f rabbitmq
docker-compose logs -f api-service
```
