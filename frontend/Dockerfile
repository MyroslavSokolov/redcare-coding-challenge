FROM node:20-alpine AS build

WORKDIR /app

# Copy workspace root and shared package
COPY package.json ./
COPY shared/ ./shared/

# Copy frontend package files
COPY frontend/package.json ./frontend/
COPY frontend/tsconfig.json ./frontend/
COPY frontend/vite.config.ts ./frontend/
COPY frontend/index.html ./frontend/

# Fresh install for Linux — include devDependencies for build
RUN npm install --workspace=frontend --workspace=shared --include=dev --package-lock-only
RUN npm install --workspace=frontend --workspace=shared --include=dev

# Copy frontend source
COPY frontend/src/ ./frontend/src/

# Build
RUN npm run build --workspace=frontend

# Serve with nginx
FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
