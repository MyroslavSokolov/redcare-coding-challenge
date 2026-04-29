FROM node:20-alpine

WORKDIR /app

# Copy workspace root and shared package
COPY package.json ./
COPY shared/ ./shared/

# Copy backend package files
COPY backend/package.json ./backend/
COPY backend/nest-cli.json ./backend/
COPY backend/tsconfig.json ./backend/
COPY backend/tsconfig.build.json ./backend/

# Fresh install for Linux — include devDependencies for build
RUN npm install --workspace=backend --workspace=shared --include=dev --package-lock-only
RUN npm install --workspace=backend --workspace=shared --include=dev

# Copy backend source
COPY backend/src/ ./backend/src/

# Build
RUN cd backend && npx nest build

EXPOSE 3000

CMD ["node", "backend/dist/main.js"]
