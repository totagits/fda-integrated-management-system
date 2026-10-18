FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN node --check server/index.js
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8080 UPLOADS_DIR=/data/uploads
RUN apk add --no-cache su-exec \
  && mkdir -p /data/uploads \
  && chown node:node /data/uploads
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server
COPY --chown=node:node server/start-api.sh ./start-api.sh
RUN chmod 755 ./start-api.sh
EXPOSE 8080

ENTRYPOINT ["/app/start-api.sh"]
