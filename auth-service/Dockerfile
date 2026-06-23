FROM node:20-alpine
WORKDIR /app

# Módulo compartido: se referencia como `../../shared` desde /app/src, por lo que
# debe ubicarse en /shared con sus propias dependencias instaladas.
COPY shared/package*.json /shared/
RUN cd /shared && npm install --omit=dev
COPY shared/ /shared/

# Servicio
COPY auth-service/package*.json ./
RUN npm install --omit=dev
COPY auth-service/ ./

EXPOSE 3001
CMD ["npm", "start"]
