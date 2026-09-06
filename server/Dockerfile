FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npm run build
EXPOSE 3001
# Сид пересоздаёт схему (sync force) и стирает данные, поэтому запускается только по SEED_ON_START
CMD ["sh", "-c", "if [ \"$SEED_ON_START\" = \"true\" ]; then node dist/config/seed.js; fi; node dist/index.js"]
