FROM node:20-alpine

WORKDIR /app

# NEXT_PUBLIC_* подставляются в бандл на этапе сборки, поэтому URL API нужен как build arg
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Свой тайл-сервер карты; пусто — тайлы и шрифты OpenFreeMap
ARG NEXT_PUBLIC_MAP_TILES_URL=
ARG NEXT_PUBLIC_MAP_GLYPHS_URL=
ENV NEXT_PUBLIC_MAP_TILES_URL=$NEXT_PUBLIC_MAP_TILES_URL
ENV NEXT_PUBLIC_MAP_GLYPHS_URL=$NEXT_PUBLIC_MAP_GLYPHS_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
