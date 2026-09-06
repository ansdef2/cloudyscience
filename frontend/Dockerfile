FROM node:18-alpine

WORKDIR /app

# NEXT_PUBLIC_* подставляются в бандл на этапе сборки, поэтому URL API нужен как build arg
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
