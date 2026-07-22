#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "📦 Installing backend dependencies..."
pip install -r requirements.txt

echo "🎨 Installing frontend dependencies..."
npm install

echo "🏗️ Building React frontend..."
npm run build

echo "✅ Build complete!"
