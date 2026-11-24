# Docker RabbitMQ Server

This project runs a RabbitMQ server and a Node.js API service using Docker Compose.

## Prerequisites

- Docker
- Docker Compose

## Setup

1.  **Environment Variables:**
    -   This project uses a `.env` file to manage configuration and secrets. A `.env.example` file is provided as a template.
    -   Make a copy of `.env.example` and rename it to `.env`.
    -   Open the `.env` file and replace the placeholder values with your own secure credentials and API keys.

    ```bash
    cp .env.example .env
    ```

2.  **Build and Start the Services:**
    -   Navigate to the `docker-RabbitMQ` directory in your terminal.
    -   Run the following command to build the images and start the containers:

    ```bash
    docker-compose up --build
    ```

    -   To run the services in the background (detached mode), use the `-d` flag:

    ```bash
    docker-compose up --build -d
    ```

## Managing the Services

-   **Stop the Services:**
    -   If the services are running in the foreground, press `Ctrl+C`.
    -   If they are running in the background, use the following command from the `docker-RabbitMQ` directory:

    ```bash
    docker-compose down
    ```

-   **View Logs:**
    -   If the services are running in the background, you can view their logs with:

    ```bash
    docker-compose logs -f
    ```

-   **Access RabbitMQ Management UI:**
    -   Once the services are running, you can access the RabbitMQ Management UI in your browser at:
    -   [http://localhost:15672](http://localhost:15672)
    -   Log in with the `RABBITMQ_DEFAULT_USER` and `RABBITMQ_DEFAULT_PASS` credentials you set in your `.env` file.

## Troubleshooting

-   **Credential Errors (`ACCESS-REFUSED`):**
    -   This can happen if you change the `RABBITMQ_DEFAULT_PASS` in your `.env` file after the server has already been started once. The RabbitMQ container saves the initial password in a persistent Docker volume.
    -   To fix this, you must completely reset the data volume. Run the following commands from the `docker-RabbitMQ` directory:

    ```bash
    # 1. Stop and remove the containers
    docker-compose down

    # 2. Remove the named volume
    docker volume rm docker-rabbitmq_rabbitmq_data

    # 3. Restart the services
    docker-compose up --build
