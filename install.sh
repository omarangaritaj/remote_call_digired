#!/bin/bash

# Script de instalación inteligente
echo "🚀 Instalando dependencias del GPIO Controller..."

# Detectar si estamos en Raspberry Pi
if grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    echo "🍓 Raspberry Pi detectada - instalando con soporte GPIO"
    pip install -r requirements-pi.txt
elif [ -f "/.dockerenv" ]; then
    echo "🐋 Entorno Docker detectado"
    if [ "$INSTALL_GPIO" = "true" ]; then
        echo "📦 Instalando con soporte GPIO para Docker"
        pip install -r requirements-pi.txt
    else
        echo "📦 Instalando sin soporte GPIO"
        pip install -r requirements.txt
    fi
else
    echo "💻 Entorno de desarrollo detectado - instalando sin GPIO"
    pip install -r requirements-dev.txt
fi

echo "✅ Instalación completada"
