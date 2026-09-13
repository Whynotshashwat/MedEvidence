FROM node:20-alpine
RUN apk add --no-cache python3 make g++
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN chown -R app:app /app
USER app
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]
