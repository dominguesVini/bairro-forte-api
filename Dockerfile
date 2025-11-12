# Etapa 1 - Build da aplicação
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

RUN mkdir -p ./dist/certs
COPY --from=builder /app/src/certs ./dist/certs

ENV DB_HOST=
ENV DB_USERNAME=
ENV DB_NAME=
ENV DB_PORT=
ENV DB_PASSWORD=''
ENV SSL_KEY_PATH=''
ENV SSL_CERT_PATH=''
ENV ONESIGNAL_APP_ID=''
ENV ONESIGNAL_API_KEY=''
ENV ONESIGNAL_INCIDENT_TEMPLATE_ID=''
ENV SENDGRID_API_KEY=''
ENV SENDGRID_FROM=''
ENV SENDGRID_TO=''
ENV API_KEY=''
ENV PORT=443
ENV FORCE_HTTP=false

EXPOSE 443

CMD ["node", "--experimental-global-webcrypto", "dist/main.js"]
