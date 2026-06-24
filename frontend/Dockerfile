# NeoWallet Frontend - Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar archivos del frontend
COPY . .

# Exponer puerto
EXPOSE 8080

# Comando para iniciar el servidor
CMD ["npm", "start"]

# Made with Bob
