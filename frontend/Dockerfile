FROM node:20-alpine AS build

WORKDIR /app

# Copy everything needed for install and build
COPY package.json ./
COPY shared/ ./shared/
COPY frontend/ ./frontend/

# Install all dependencies fresh for Linux
RUN npm install --include=dev --package-lock-only
RUN npm install --include=dev

# Build the frontend
RUN npm run build --workspace=frontend

# Serve with nginx
FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
