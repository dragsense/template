#!/bin/bash

# Deployment script - Copy env files then build Docker

# Install make if not present (e.g. on minimal Ubuntu)
if ! command -v make &>/dev/null; then
  sudo apt-get update && sudo apt-get install -y make
fi

# Copy env files from shared to backend and frontend
cp -f ../shared/.env ./backend/.env
cp -f ../shared/.env.prod ./frontend/.env.prod
cp -f ../shared/.env.dev ./frontend/.env.dev
cp -f ../shared/.env.shared ./shared/.env

# Build and start Docker
make safe-setup-prod

# Show last 15 lines of logs from template-app container
docker logs --tail 15 template-app-staging

echo "✅ Backend server started!"
