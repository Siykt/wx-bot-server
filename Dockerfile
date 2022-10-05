FROM node:lts-alpine

WORKDIR /app/service

RUN apk update && apk add --no-cache nmap && \
  echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
  echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
  apk update && \
  apk add --no-cache \
  chromium \
  harfbuzz \
  "freetype>2.8" \
  ttf-freefont \
  nss


ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium-browser
ENV NODE_ENV=production

COPY package.json ./package.json
RUN yarn --production --ignore-optional

COPY ./prisma ./prisma
COPY ./.env ./
COPY ./dist ./dist

RUN npx prisma generate

EXPOSE 4000

CMD npm run start
