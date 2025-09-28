# Build Stage
FROM node:22.19.0-bullseye-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
 # Erzeugt /app/dist
RUN npm run build 

# Production Stage
FROM node:22.19.0-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3003

CMD ["node", "dist/server.js"]