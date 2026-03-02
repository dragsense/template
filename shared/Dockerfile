# Single Container Dockerfile - Both Frontend and Backend
FROM node:22 AS base

# 1️⃣ Install basic tools
RUN apt-get update && apt-get install -y \
    git \
    openssh-client \
    curl \
    ca-certificates \
    rsync \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 2️⃣ Fix DNS (Google DNS)
ENV DNS_SERVERS="8.8.8.8 1.1.1.1"
RUN echo "DNS servers set to $DNS_SERVERS"
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

# 3️⃣ Configure SSH (optional)
RUN mkdir -p /root/.ssh && chmod 700 /root/.ssh
# If you plan to mount your host SSH keys, they’ll be placed here at runtime

# 4️⃣ Improve npm/pnpm performance (fast mirror)
RUN npm config set registry https://registry.npmmirror.com \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set prefer-offline true \
    && npm config set progress false

# Create app directory and set proper permissions
RUN mkdir -p /app && chown -R node:node /app

WORKDIR /app

# Install pnpm, NestJS CLI, PM2, and Git
RUN npm install -g pnpm @nestjs/cli pm2

# 6️⃣ Optional: set pnpm mirror + persistent cache
RUN pnpm config set registry https://registry.npmmirror.com \
    && pnpm config set store-dir /root/.pnpm-store



# Copy package files from all services
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY shared/package.json ./shared/

# Install shared dependencies
WORKDIR /app/shared
RUN pnpm install

# Install backend dependencies
WORKDIR /app/backend
RUN pnpm install

# Install frontend dependencies
WORKDIR /app/frontend
RUN pnpm install

WORKDIR /app

# Copy shared code (needed for dependencies)
COPY shared/ ./shared/

# Copy backend code (needed for dependencies)
COPY backend/ ./backend/

# Copy frontend code (needed for dependencies)
COPY frontend/ ./frontend/


# Development stage
FROM base AS dev
# Expose ports for both services
EXPOSE 3000 5173

# Default command - keep container running
CMD ["tail", "-f", "/dev/null"]

# Production build stage
FROM base AS build
WORKDIR /app/backend
RUN pnpm run build

WORKDIR /app/frontend
RUN pnpm run build

# Production stage
FROM node:22 AS prod
WORKDIR /app

# Install pnpm and PM2
RUN npm install -g pnpm pm2

# Copy package files for production dependencies
COPY backend/package.json backend/pnpm-lock.yaml ./backend/
COPY shared/package.json shared/pnpm-lock.yaml ./shared/

# Install production dependencies
WORKDIR /app/shared
RUN pnpm install --prod
WORKDIR /app/backend
RUN pnpm install --prod
WORKDIR /app

# Copy built backend (frontend is already inside dist/backend/client/dist)
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/shared ./shared

# Copy environment files
COPY backend/.env* ./backend/

# Create logs directory
RUN mkdir -p ./backend/logs

# Copy PM2 config into /app
COPY ecosystem.config.js ./

# Start with PM2 (can be restarted via deploy script)
CMD ["pm2", "start", "ecosystem.config.js", "--only", "template-staging", "--no-daemon"]

