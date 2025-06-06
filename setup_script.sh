#!/bin/bash

# Script de configuración para Raspberry Pi GPIO Controller

echo "🚀 Configurando Raspberry Pi GPIO Controller..."

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

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env..."
    cp .env.example .env
    echo "⚠️  Por favor, edita el archivo .env con tus credenciales de API"
    echo "   Usa: nano .env"
else
    echo "✅ Archivo .env ya existe"
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

echo "✅ Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Edita el archivo .env con tus credenciales: nano .env"
echo "2. Construye la imagen: docker-compose build"
echo "3. Ejecuta el contenedor: docker-compose up -d"
echo "4. Ve los logs: docker-compose logs -f"
echo ""
echo "🔗 Conexiones GPIO requeridas:"
echo "   Interruptores: GPIO 2, 3, 4, 17, 27 (con GND)"
echo "   Bombillos: GPIO 18, 23, 24, 25, 8 (con resistencias)"
echo ""
echo "🌐 La aplicación estará disponible en: http://localhost:8000"