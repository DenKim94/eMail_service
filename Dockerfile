# ============================================
# Build Stage
# ============================================
FROM node:26.13.0-trixie-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
 # Erzeugt /app/dist
RUN npm run build 

# ============================================
# Test Stage
# ============================================
FROM node:26.13.0-trixie-slim AS test
WORKDIR /app

# Dependencies für Tests (inkl. devDependencies) installieren
COPY package*.json ./
RUN npm ci

# Source Code und Tests kopieren
COPY . .

# Tests ausführen
RUN npm test

# ============================================
# Production Stage
# ============================================
FROM node:26.13.0-trixie-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3003

CMD ["node", "dist/server.js"]