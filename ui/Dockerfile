FROM node:18-alpine
WORKDIR /app
COPY server.js .
RUN npm init -y && npm install express axios body-parser express-session
EXPOSE 80
CMD ["node", "server.js"]
