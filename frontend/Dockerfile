# --- Etapa 1: build de la SPA con Vite ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Las URLs de los microservicios se pueden sobreescribir en build con
# --build-arg, pero por defecto apuntan a los puertos publicados en el host.
ARG VITE_ACCOUNTS_URL=http://localhost:8000
ARG VITE_PROCESSOR_URL=http://localhost:3001
ARG VITE_NOTIFICATIONS_URL=http://localhost:3002
ENV VITE_ACCOUNTS_URL=$VITE_ACCOUNTS_URL \
    VITE_PROCESSOR_URL=$VITE_PROCESSOR_URL \
    VITE_NOTIFICATIONS_URL=$VITE_NOTIFICATIONS_URL
RUN npm run build

# --- Etapa 2: servir estáticos con nginx ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
