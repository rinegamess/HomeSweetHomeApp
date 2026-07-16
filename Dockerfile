# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build the client & compile the server CJS bundle
RUN npm run build

# Stage 2: Run the application
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy package configurations
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from the builder stage
COPY --from=builder /app/dist ./dist

# Expose port 3000
EXPOSE 3000

# Start the bundled server
CMD ["npm", "run", "start"]
