FROM node:20-alpine AS build

WORKDIR /app

# Copy everything needed
COPY package.json ./
COPY shared/ ./shared/
COPY backend/ ./backend/

# Clean install for Linux
RUN npm install --include=dev --package-lock-only && npm install --include=dev

# Build using tsc directly (avoids nest CLI resolution issues in Docker)
RUN cd backend && npx tsc -p tsconfig.build.json

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY shared/ ./shared/
COPY backend/package.json ./backend/

RUN npm install --omit=dev --package-lock-only && npm install --omit=dev

COPY --from=build /app/backend/dist ./backend/dist

EXPOSE 3000

CMD ["node", "backend/dist/src/main.js"]
