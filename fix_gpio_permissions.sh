#!/bin/bash

echo "🔧 Solucionando permisos GPIO para Docker..."

# Detener contenedor si está corriendo
docker-compose down

# Verificar y configurar permisos GPIO
echo "📋 Verificando configuración GPIO..."

# Verificar si el grupo gpio existe
if ! getent group gpio > /dev/null 2>&1; then
    echo "⚠️ Creando grupo gpio..."
    sudo groupadd gpio
fi

# Agregar usuario actual al grupo gpio
sudo usermod -a -G gpio $USER

# Configurar permisos para /dev/gpiomem
if [ -e /dev/gpiomem ]; then
    sudo chown root:gpio /dev/gpiomem
    sudo chmod g+rw /dev/gpiomem
    echo "✅ Permisos configurados para /dev/gpiomem"
else
    echo "⚠️ /dev/gpiomem no encontrado"
fi

# Configurar permisos para /dev/mem
if [ -e /dev/mem ]; then
    sudo chown root:gpio /dev/mem
    sudo chmod g+rw /dev/mem
    echo "✅ Permisos configurados para /dev/mem"
else
    echo "⚠️ /dev/mem no encontrado"
fi

# Habilitar GPIO en config.txt si no está habilitado
if ! grep -q "dtparam=gpio=on" /boot/config.txt; then
    echo "dtparam=gpio=on" | sudo tee -a /boot/config.txt
    echo "✅ GPIO habilitado en /boot/config.txt"
fi

# Verificar módulos GPIO
echo "📦 Verificando módulos GPIO..."
sudo modprobe gpio_dev 2>/dev/null || echo "⚠️ Módulo gpio_dev no disponible"

echo ""
echo "🔄 Reconstruyendo y reiniciando contenedor..."
docker-compose build --no-cache
docker-compose up -d

echo ""
echo "✅ Configuración completada!"
echo "📋 Verificando estado del contenedor en 10 segundos..."
sleep 10
docker-compose logs --tail=20