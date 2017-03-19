FROM node:7.7.0-alpine

WORKDIR /opt

ADD server.js /opt
ADD package.json /opt

RUN npm install

CMD ["npm", "start"]