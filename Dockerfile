FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
	&& apk add --no-cache libstdc++ \
	&& if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
	&& apk del .build-deps

COPY . .

RUN mkdir -p uploads && chmod 777 uploads
RUN mkdir -p data && chmod 777 data
RUN mkdir -p config && chmod 777 config

RUN rm -f .env

EXPOSE 3000

CMD ["node", "index.js"]
