FROM node:20-alpine

WORKDIR /app

# Copy workspace root and shared package
COPY package.json package-lock.json ./
COPY shared/ ./shared/

# Copy backend package files
COPY backend/package.json ./backend/

# Install dependencies
RUN npm install --workspace=backend --workspace=shared

# Copy backend source
COPY backend/ ./backend/

# Build
RUN npm run build --workspace=backend

EXPOSE 3000

CMD ["node", "backend/dist/main.js"]
