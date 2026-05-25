# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/src ./src
COPY --from=builder /app/exchange_transactions.csv ./exchange_transactions.csv
COPY --from=builder /app/user_transactions.csv ./user_transactions.csv

# Run under non-privileged user for security
USER node
EXPOSE 3000
CMD ["node", "src/app.js"]
