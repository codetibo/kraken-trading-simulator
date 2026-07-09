# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:22-alpine

WORKDIR /app

# Copy manifest and lockfile first for better layer caching.
COPY package.json package-lock.json ./

# Install dependencies (the compose command also runs `npm install` into a
# named volume at runtime, so this keeps the image self-contained as a fallback).
RUN npm ci

# Copy the rest of the project.
COPY . .

# Generate the Prisma client (output: app/generated/prisma).
RUN npx prisma generate

EXPOSE 3000

# Default command; docker-compose overrides this to also run migrations + seed.
CMD ["npm", "run", "dev"]
