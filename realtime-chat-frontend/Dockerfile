# Stage 1: Build the Vite React application
FROM node:20-alpine AS build
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Accept build arguments for Vite environment variables
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Build production assets
RUN npm run build

# Stage 2: Serve the application with a lightweight production server
FROM node:20-alpine
WORKDIR /app

# Install lightweight static server with SPA rewrite support
RUN npm install -g serve

# Copy built artifacts from builder stage
COPY --from=build /app/dist ./dist

# Railway provides dynamic $PORT environment variable
EXPOSE 3000
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]