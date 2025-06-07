FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

RUN npm install node-fetch@2

COPY . .

RUN mkdir -p uploads && chmod 777 uploads
RUN mkdir -p data && chmod 777 data
RUN mkdir -p config && chmod 777 config

RUN rm -f .env

EXPOSE 3000

CMD ["node", "index.js"]
