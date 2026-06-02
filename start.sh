#!/usr/bin/env bash
set -e

echo "🍽️  Chop First — Investor Prototype"
echo "================================"
echo ""

# Install deps
echo "📦 Installing dependencies..."
npm install --prefix backend --silent
npm install --prefix frontend --silent

# Seed database
echo "🌱 Seeding database..."
npm run seed --prefix backend

# Start backend & frontend
echo "🚀 Starting services..."
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo ""
npx concurrently \
  --names "BE,FE" \
  --prefix-colors "green,blue" \
  "npm run dev --prefix backend" \
  "npm run dev --prefix frontend"
