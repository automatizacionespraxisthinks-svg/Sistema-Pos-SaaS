FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# API_GATEWAY_URL must be known at build time because Next.js bakes rewrites()
# into .next/routes-manifest.json during `next build`.
ARG API_GATEWAY_URL=http://api-gateway:3000
ENV API_GATEWAY_URL=$API_GATEWAY_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3010
CMD ["npm", "run", "start"]
