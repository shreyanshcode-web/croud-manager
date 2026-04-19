# =============================================================================
# SmartVenue AI — Multi-stage Dockerfile
# Stage 1: build the React/Vite frontend
# Stage 2: production Node image with only runtime deps + compiled frontend
# =============================================================================

# --- Stage 1: build ---
FROM node:20-alpine AS builder

WORKDIR /build

# Install deps first (layer cached unless package.json changes)
COPY package*.json ./
RUN npm ci

# Copy source and build the Vite frontend
COPY . .

# Build-time environment variables for Vite
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_GA_MEASUREMENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID

RUN npm run build
# dist/ is now populated

# Prune to production-only deps for the runtime stage
RUN npm ci --omit=dev

# --- Stage 2: runtime ---
FROM node:20-alpine AS runtime

# Tini gives us proper PID 1 signal handling inside the container
RUN apk add --no-cache tini

WORKDIR /app

# Copy only what the server needs at runtime
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist         ./dist
COPY --from=builder /build/src          ./src
COPY --from=builder /build/server.js    ./server.js
COPY --from=builder /build/package.json ./package.json

# Cloud Run injects PORT; default to 8080
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Use tini as entrypoint so signals (SIGTERM) are forwarded correctly
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
