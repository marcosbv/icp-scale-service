FROM node:10.15.0-alpine
WORKDIR "/app"

COPY package.json /app/
RUN cd /app && npm install --production

COPY . /app

ENV NODE_ENV production
ENV PORT 3000

EXPOSE 3000

CMD ["npm", "start"]