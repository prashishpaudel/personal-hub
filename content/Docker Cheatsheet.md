---
title: Docker Cheatsheet
date: 2026-05-10
tags: [docker, tools, devops]
---

# Docker Cheatsheet

## Essentials

```bash
docker --version                    # check version
docker images                       # list images
docker ps                           # list running containers
docker ps -a                        # list all containers (running + stopped)
```

## Running Containers

```bash
docker run image_name               # attached (foreground, non-interactive)
docker run -d image_name            # detached (background)
docker run -it image_name /bin/bash # interactive shell
docker run --rm image_name          # auto-remove on exit
docker run --gpus all image_name    # GPU access (NVIDIA)
docker run -p 8080:80 image_name    # port map host:container
docker run -v $(pwd):/app image_name # mount volume
```

## Container Lifecycle

```bash
docker stop <CONTAINER ID>          # stop
docker start <CONTAINER ID>         # restart stopped container
docker rm <CONTAINER ID>            # delete container
docker rmi <IMAGE ID>               # delete image
docker exec -it <CONTAINER ID> /bin/bash  # shell into running container
```

## Logs

```bash
docker logs <CONTAINER ID>          # show logs
docker logs -f <CONTAINER ID>       # follow logs (tail)
```

## Build & Push

```bash
docker build -t image-name:tag .                    # build from Dockerfile
docker pull <image>                                 # pull from registry
docker login                                        # login to Docker Hub
docker push <username>/<image>:tag                  # push to registry
```

Build + push flow:
```bash
docker build -t nlpprepare/event-detection:latest .
docker push nlpprepare/event-detection:latest
```

---

## Docker Compose

Define multi-container apps in `docker-compose.yml`. Spin up entire stack with one command.

### Basic `docker-compose.yml`

```yaml
version: "3.9"
services:
  web:
    image: nginx:latest
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: app
    volumes:
      - db-data:/var/lib/postgresql/data
volumes:
  db-data:
```

### Compose Commands

```bash
docker compose pull                 # pull latest images
docker compose build                # rebuild images
docker compose up                   # start all services (attached)
docker compose up -d                # start detached
docker compose down                 # stop and remove containers + network
docker compose down -v              # also remove volumes

docker compose ps                   # list services
docker compose logs -f              # follow logs
docker compose logs -f web          # logs of one service
docker compose exec web bash        # shell into service
docker compose restart web          # restart one service

docker compose config --services     # just service names
docker compose config --volumes      # just named volumes
docker compose config --profiles     # just profiles
docker compose config --images       # images each service uses
docker compose config --quiet        # validate only, no output (good for CI)
```

### Common Patterns

Build from local Dockerfile:
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
```

Environment file:
```yaml
services:
  app:
    env_file:
      - .env
```

Override for dev (`docker-compose.override.yml` auto-loaded):
```yaml
services:
  app:
    volumes:
      - .:/app
    command: npm run dev
```
