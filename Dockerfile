FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx knex migrate:latest

CMD [ "npm", "start" ]