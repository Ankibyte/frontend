FROM node:16-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build for production
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]