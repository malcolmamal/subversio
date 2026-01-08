#!/bin/bash
set -e

echo "🔍 Running Quality Pipeline..."

echo "🏗️  Building Backend..."
npm run build:backend

echo "🧪 Testing Backend..."
npm run test:backend

echo "🏗️  Building Frontend..."
npm run build:frontend

echo "🧪 Testing Frontend..."
npm run test:frontend

echo "🧹 Linting Project..."
npm run lint

echo "✨ Fixing Formatting..."
npm run format

echo "✅ Quality Pipeline Passed!"

