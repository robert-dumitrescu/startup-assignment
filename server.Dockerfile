FROM node:alpine
WORKDIR /app
COPY package*.json ./
RUN npm i
COPY src ./
COPY tsconfig.json ./
RUN npm run tsc
CMD ["npm", "run", "start:server"]