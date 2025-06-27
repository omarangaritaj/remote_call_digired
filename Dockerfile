# Dockerfile

FROM node:22.11.0-bullseye-slim

# Install system dependencies for build tools (needed for native modules)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    make \
    g++ \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# install nestjs CLI globallyDockerfile
RUN npm install -g @nestjs/cli

# Install dependencies (include dev dependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Clean up dev dependencies after build
RUN npm prune --omit=dev

# Create non-root user for production (commented out for GPIO access)
# RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
# RUN chown -R nodejs:nodejs /app
# USER nodejs

RUN groupadd -f -g 997 gpio

# Configurar usuario
RUN usermod -a -G gpio node
#RUN mkdir -p /dev/gpiomem
#RUN /bin/sh -c chmod g+rw /dev/gpiomem

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "run", "start:prod"]
