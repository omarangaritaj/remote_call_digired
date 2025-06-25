#!/bin/bash

# Raspberry Pi GPIO Controller Setup Script
echo "🚀 Setting up Raspberry Pi GPIO Controller..."

# Create directories
mkdir -p data
mkdir -p logs

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker instalado. Necesitas reiniciar la sesión para usar Docker sin sudo."
fi

# Verificar si Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Instalando..."
    sudo apt-get update
    sudo apt-get install -y docker-compose
    echo "✅ Docker Compose instalado."
fi

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please edit .env file with your configuration"
fi

# Habilitar GPIO en Raspberry Pi
echo "🔧 Verificando configuración GPIO..."
if ! grep -q "dtparam=spi=on" /boot/config.txt; then
    echo "dtparam=spi=on" | sudo tee -a /boot/config.txt
fi

if ! grep -q "dtparam=i2c_arm=on" /boot/config.txt; then
    echo "dtparam=i2c_arm=on" | sudo tee -a /boot/config.txt
fi

# Agregar usuario al grupo gpio
sudo usermod -a -G gpio $USER

echo "4️⃣ Habilitando GPIO en configuración del sistema..."
if ! grep -q "dtparam=gpio=on" /boot/config.txt 2>/dev/null; then
    if [ -w /boot/config.txt ]; then
        echo "dtparam=gpio=on" | sudo tee -a /boot/config.txt > /dev/null
        echo "   ✅ GPIO habilitado en /boot/config.txt"
    else
        echo "   ⚠️ No se pudo escribir en /boot/config.txt"
    fi
else
    echo "   ✅ GPIO ya habilitado en configuración"
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
