FROM mcr.microsoft.com/playwright:v1.48.0-focal

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3001

ENV HEADLESS=true
ENV PORT=3001

CMD ["npm", "start"]
