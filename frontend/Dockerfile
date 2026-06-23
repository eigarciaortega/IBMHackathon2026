# --- Etapa de build ---
FROM node:22-alpine AS build
WORKDIR /app

# Instala dependencias con la lockfile para builds reproducibles.
COPY package.json package-lock.json ./
RUN npm ci

# Las URLs de los servicios se inyectan en tiempo de build (Vite las hornea en el
# bundle). docker-compose / Dokploy las pasan como build args.
ARG VITE_AUTH_URL
ARG VITE_CATALOG_URL
ARG VITE_BOOKING_URL
ENV VITE_AUTH_URL=$VITE_AUTH_URL
ENV VITE_CATALOG_URL=$VITE_CATALOG_URL
ENV VITE_BOOKING_URL=$VITE_BOOKING_URL

COPY . .
RUN npm run build

# --- Etapa de producción ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
