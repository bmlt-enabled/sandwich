FROM node:7.7.0-alpine

WORKDIR /opt

ADD *.js /opt/
ADD lib/*.js /opt/lib/
ADD package.json /opt

RUN npm install

EXPOSE 8888 8889

CMD ["npm", "start"]