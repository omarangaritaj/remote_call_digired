#!/bin/bash

echo "🔧 Configuración completa de GPIO para Raspberry Pi"

# Detener contenedor si está corriendo
docker-compose down 2>/dev/null

echo "1️⃣ Verificando y creando grupo gpio..."

# Verificar si el grupo gpio existe, si no, crearlo
if ! getent group gpio > /dev/null 2>&1; then
    echo "   Creando grupo gpio..."
    sudo groupadd -r gpio
    echo "   ✅ Grupo gpio creado"
else
    echo "   ✅ Grupo gpio ya existe"
fi

# Obtener GID del grupo gpio
GPIO_GID=$(getent group gpio | cut -d: -f3)
echo "   📋 GPIO GID: $GPIO_GID"

echo ""
echo "2️⃣ Configurando permisos de dispositivos..."

# Configurar permisos para dispositivos GPIO
if [ -e /dev/gpiomem ]; then
    sudo chown root:gpio /dev/gpiomem
    sudo chmod 660 /dev/gpiomem
    echo "   ✅ /dev/gpiomem configurado"
else
    echo "   ⚠️ /dev/gpiomem no encontrado"
fi

if [ -e /dev/mem ]; then
    sudo chown root:gpio /dev/mem
    sudo chmod 660 /dev/mem
    echo "   ✅ /dev/mem configurado"
else
    echo "   ⚠️ /dev/mem no encontrado"
fi

echo ""
echo "3️⃣ Agregando usuario actual al grupo gpio..."
sudo usermod -a -G gpio $USER
echo "   ✅ Usuario $USER agregado al grupo gpio"

echo ""
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

echo ""
echo "5️⃣ Actualizando docker-compose.yml con GID correcto..."

# Crear archivo docker-compose actualizado con el GID correcto
cat > docker-compose.yml << EOF
version: '3.8'

services:
  gpio-controller:
    build: .
    container_name: raspberry-gpio-controller
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - API_URL=\${API_URL}
      - API_KEY=\${API_KEY}
      - API_TOKEN=\${API_TOKEN}
      - DEVICE_ID=\${DEVICE_ID:-raspberry-pi-001}
    privileged: true
    volumes:
      - /sys:/sys
      - /dev:/dev
    devices:
      - /dev/gpiomem:/dev/gpiomem
      - /dev/mem:/dev/mem
    group_add:
      - $GPIO_GID
    networks:
      - gpio-network

networks:
  gpio-network:
    driver: bridge
EOF

echo "   ✅ docker-compose.yml actualizado con GID $GPIO_GID"

echo ""
echo "6️⃣ Reconstruyendo imagen Docker..."
docker-compose build --no-cache

echo ""
echo "7️⃣ Iniciando contenedor..."
docker-compose up -d

echo ""
echo "8️⃣ Verificando estado del contenedor..."
sleep 5

# Verificar estado
if docker-compose ps | grep -q "Up"; then
    echo "   ✅ Contenedor iniciado correctamente"
    echo ""
    echo "📋 Últimos logs:"
    docker-compose logs --tail=10
    echo ""
    echo "🌐 Aplicación disponible en: http://localhost:8000"
    echo "📊 Estado: curl http://localhost:8000/"
    echo "🔍 Logs en tiempo real: docker-compose logs -f"
else
    echo "   ❌ Error iniciando contenedor"
    echo ""
    echo "📋 Logs de error:"
    docker-compose logs --tail=20
    echo ""
    echo "🔧 Comandos de diagnóstico:"
    echo "   docker-compose ps"
    echo "   docker-compose logs"
    echo "   ls -la /dev/gpio*"
    echo "   groups $USER"
fi

echo ""
echo "ℹ️ Información importante:"
echo "   - Si cambias de usuario, necesitarás hacer logout/login para que los grupos tomen efecto"
echo "   - En caso de reinicio del sistema, los permisos de /dev pueden resetear"
echo "   - Para debugging: docker-compose exec gpio-controller bash"
EOF
