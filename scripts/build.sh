#!/bin/bash

# Build script for Raspberry Pi GPIO Controller
set -e

echo "🚀 Raspberry Pi GPIO Controller - Build Script"
echo "=============================================="

# Parse command line arguments
MODE=${1:-production}
ACTION=${2:-build}

case $MODE in
  "production"|"prod")
    echo "📦 Building for PRODUCTION..."
    COMPOSE_PROFILES="production"
    SERVICE_NAME="gpio-controller"
    ;;
  "development"|"dev")
    echo "🔧 Building for DEVELOPMENT..."
    COMPOSE_PROFILES="development"
    SERVICE_NAME="gpio-controller-dev"
    ;;
  *)
    echo "❌ Invalid mode. Use: production|prod or development|dev"
    exit 1
    ;;
esac

case $ACTION in
  "build")
    echo "🏗️  Building Docker image..."
    COMPOSE_PROFILES=$COMPOSE_PROFILES docker-compose build --no-cache $SERVICE_NAME
    echo "✅ Build completed!"
    ;;
  "up")
    echo "🏗️  Building and starting service..."
    COMPOSE_PROFILES=$COMPOSE_PROFILES docker-compose up --build -d $SERVICE_NAME
    echo "✅ Service started!"
    echo "📊 Logs: docker-compose logs -f $SERVICE_NAME"
    ;;
  "start")
    echo "▶️  Starting service..."
    COMPOSE_PROFILES=$COMPOSE_PROFILES docker-compose up -d $SERVICE_NAME
    echo "✅ Service started!"
    ;;
  "stop")
    echo "⏹️  Stopping service..."
    docker-compose stop $SERVICE_NAME
    echo "✅ Service stopped!"
    ;;
  "logs")
    echo "📋 Showing logs..."
    docker-compose logs -f $SERVICE_NAME
    ;;
  "clean")
    echo "🧹 Cleaning up..."
    docker-compose down
    docker system prune -f
    echo "✅ Cleanup completed!"
    ;;
  *)
    echo "❌ Invalid action. Use: build|up|start|stop|logs|clean"
    exit 1
    ;;
esac

echo ""
echo "📱 Available endpoints:"
echo "  - Health: http://localhost:3000/health"
echo "  - Status: http://localhost:3000/status"
echo "  - Test: curl -X POST http://localhost:3000/test/switch/0"
