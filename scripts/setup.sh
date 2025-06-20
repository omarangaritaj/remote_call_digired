#!/bin/bash

# Raspberry Pi GPIO Controller Setup Script
echo "🚀 Setting up Raspberry Pi GPIO Controller..."

# Create directories
mkdir -p data
mkdir -p logs

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please edit .env file with your configuration"
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Build the application
echo "🏗️  Building application..."
npm run build

# Set up GPIO permissions (if running on Raspberry Pi)
if [ -f /proc/device-tree/model ] && grep -q "Raspberry Pi" /proc/device-tree/model; then
    echo "🔧 Setting up GPIO permissions..."

    # Add current user to gpio group
    sudo usermod -a -G gpio $USER

    # Set permissions for GPIO memory access
    sudo chmod 666 /dev/gpiomem
    sudo chmod 666 /dev/mem

    echo "✅ GPIO permissions configured"
    echo "⚠️  You may need to restart your session for group changes to take effect"
else
    echo "⚠️  Not running on Raspberry Pi - GPIO setup skipped"
fi

echo "✅ Setup completed!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API configuration"
echo "2. Run: npm run start:prod"
echo "3. Or use Docker: docker-compose up -d"
