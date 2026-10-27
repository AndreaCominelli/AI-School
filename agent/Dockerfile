FROM node:25.9.0-slim

WORKDIR /app

COPY package.json /app
RUN npm install
COPY . /app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm","start"]