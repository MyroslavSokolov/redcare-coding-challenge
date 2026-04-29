FROM node:20-alpine AS build

WORKDIR /app

# Copy workspace root and shared package
COPY package.json ./
COPY shared/ ./shared/

# Copy frontend package files
COPY frontend/package.json ./frontend/

# Fresh install for Linux (ignore Windows lock file)
RUN npm install --workspace=frontend --workspace=shared --package-lock-only
RUN npm install --workspace=frontend --workspace=shared

# Copy frontend source
COPY frontend/ ./frontend/

# Build
RUN npm run build --workspace=frontend

# Serve with nginx
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Copy nginx config for API proxy
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
