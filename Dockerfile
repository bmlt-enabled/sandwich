FROM node:7.7.0-alpine

ADD . /opt

WORKDIR /opt

RUN npm install

CMD ["node", "server.js"]