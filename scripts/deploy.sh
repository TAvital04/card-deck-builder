#!/usr/bin/env bash
set -e  # Exit immediately if any command fails (prevents broken partial deploys!)

echo "🚀 Starting deployment to production..."

# 1. Pull latest verified code from main
git checkout main
git pull origin main

# 2. Install production backend dependencies & restart Express via PM2
echo "📦 Updating Backend API..."
cd backend
npm ci --omit=dev
pm2 describe deckbuilder-api > /dev/null \
  && pm2 restart deckbuilder-api \
  || pm2 start src/server.js --name deckbuilder-api
cd ..

# 3. Install frontend dependencies & compile production bundle (frontend/dist)
echo "🎨 Building Frontend Production Bundle..."
cd frontend
npm ci
npm run build
cd ..

echo "✅ Deployment complete! API and Web UI are live."
