#!/bin/bash

# Script de instalación inteligente
echo "🚀 Instalando dependencias del GPIO Controller..."

# Función para instalar dependencias
install_requirements() {
    local req_file=$1
    echo "📦 Instalando desde: $req_file"

    if [ -f "$req_file" ]; then
        pip install --no-cache-dir -r "$req_file"
        if [ $? -eq 0 ]; then
            echo "✅ Instalación exitosa desde $req_file"
        else
            echo "❌ Error instalando desde $req_file"
            exit 1
        fi
    else
        echo "❌ Archivo $req_file no encontrado"
        exit 1
    fi
}

# Detectar entorno
if [ -f "/.dockerenv" ]; then
    echo "🐋 Entorno Docker detectado"
    if [ "$INSTALL_GPIO" = "true" ]; then
        echo "📦 Instalando con soporte GPIO para Docker"
        install_requirements "requirements-pi.txt"
    else
        echo "📦 Instalando sin soporte GPIO"
        install_requirements "requirements.txt"
    fi
elif grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    echo "🍓 Raspberry Pi detectada - instalando con soporte GPIO"
    install_requirements "requirements-pi.txt"
else
    echo "💻 Entorno de desarrollo detectado - instalando sin GPIO"
    install_requirements "requirements-dev.txt"
fi

# Verificar instalación crítica
echo "🔍 Verificando instalaciones críticas..."
python -c "import uvicorn; print('✅ uvicorn instalado correctamente')" || {
    echo "❌ uvicorn no se instaló correctamente"
    exit 1
}

python -c "import fastapi; print('✅ fastapi instalado correctamente')" || {
    echo "❌ fastapi no se instaló correctamente"
    exit 1
}

echo "✅ Instalación completada y verificada"
