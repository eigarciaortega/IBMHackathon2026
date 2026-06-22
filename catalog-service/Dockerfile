FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY src/ ./src/

EXPOSE 3001

ENV NODE_ENV=production

USER node

CMD ["node", "src/index.js"]

# Made with Bob
