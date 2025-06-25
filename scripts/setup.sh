#!/bin/bash

# =============================================================================
# Raspberry Pi GPIO Controller - Complete Setup Script
# Configura GPIO, Docker, dependencias y permisos en una sola ejecución
# =============================================================================

set -e  # Exit on any error

echo "🚀 Raspberry Pi GPIO Controller - Complete Setup"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# =============================================================================
# 1. System Verification
# =============================================================================
echo ""
echo "1️⃣ Verificando sistema..."

# Check if running on Raspberry Pi
if [ ! -f /proc/device-tree/model ] || ! grep -q "Raspberry Pi" /proc/device-tree/model; then
    print_warning "No se detectó una Raspberry Pi"
    print_info "El sistema funcionará en modo simulación"
    IS_RASPBERRY_PI=false
else
    MODEL=$(cat /proc/device-tree/model)
    print_status "Raspberry Pi detectada: $MODEL"
    IS_RASPBERRY_PI=true
fi

# =============================================================================
# 2. Docker Installation
# =============================================================================
echo ""
echo "2️⃣ Configurando Docker..."

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    print_info "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    print_status "Docker instalado"
else
    print_status "Docker ya está instalado"
fi

# Install Docker Compose if not present
if ! command -v docker compose &> /dev/null; then
    print_info "Instalando Docker Compose..."
    sudo apt-get update -qq
    sudo apt-get install -y docker compose
    print_status "Docker Compose instalado"
else
    print_status "Docker Compose ya está instalado"
fi

# Add user to docker group
if ! groups $USER | grep -q docker; then
    print_info "Agregando usuario al grupo docker..."
    sudo usermod -aG docker $USER
    print_warning "Necesitarás reiniciar la sesión para usar Docker sin sudo"
    NEED_REBOOT=true
else
    print_status "Usuario ya está en el grupo docker"
fi

# =============================================================================
# 3. GPIO Configuration (Only on Raspberry Pi)
# =============================================================================
if [ "$IS_RASPBERRY_PI" = true ]; then
    echo ""
    echo "3️⃣ Configurando GPIO..."

    # Enable GPIO in boot config
    print_info "Habilitando GPIO en configuración del sistema..."

    # Backup boot config
    sudo cp /boot/config.txt /boot/config.txt.backup.$(date +%Y%m%d_%H%M%S)

    # Enable GPIO, SPI, and I2C
    declare -a GPIO_PARAMS=("dtparam=gpio=on" "dtparam=spi=on" "dtparam=i2c_arm=on")

    for param in "${GPIO_PARAMS[@]}"; do
        if ! grep -q "^$param" /boot/config.txt; then
            echo "$param" | sudo tee -a /boot/config.txt > /dev/null
            print_status "$param agregado a /boot/config.txt"
        else
            print_status "$param ya está habilitado"
        fi
    done

    # Create gpio group if it doesn't exist
    if ! getent group gpio > /dev/null 2>&1; then
        print_info "Creando grupo gpio..."
        sudo groupadd gpio
        print_status "Grupo gpio creado"
    else
        print_status "Grupo gpio ya existe"
    fi

    # Add user to gpio group
    if ! groups $USER | grep -q gpio; then
        print_info "Agregando usuario al grupo gpio..."
        sudo usermod -a -G gpio $USER
        print_status "Usuario agregado al grupo gpio"
        NEED_REBOOT=true
    else
        print_status "Usuario ya está en el grupo gpio"
    fi

    # Set up udev rules for persistent GPIO permissions
    print_info "Configurando reglas udev para GPIO..."
    sudo tee /etc/udev/rules.d/99-gpio.rules > /dev/null << 'EOF'
# GPIO permissions for Docker containers
KERNEL=="gpiomem", GROUP="gpio", MODE="0666"
KERNEL=="gpio*", GROUP="gpio", MODE="0666"
SUBSYSTEM=="gpio", GROUP="gpio", MODE="0666"
SUBSYSTEM=="spidev", GROUP="gpio", MODE="0666"
SUBSYSTEM=="i2c-dev", GROUP="gpio", MODE="0666"
EOF

    # Reload udev rules
    sudo udevadm control --reload-rules
    sudo udevadm trigger
    print_status "Reglas udev configuradas"

    # Set immediate permissions for current session
    print_info "Configurando permisos inmediatos..."
    if [ -c /dev/gpiomem ]; then
        sudo chgrp gpio /dev/gpiomem
        sudo chmod 666 /dev/gpiomem
        print_status "Permisos de /dev/gpiomem configurados"
    fi

    if [ -c /dev/mem ]; then
        sudo chmod 666 /dev/mem
        print_status "Permisos de /dev/mem configurados"
    fi

    # Enable GPIO interfaces via raspi-config
    print_info "Habilitando interfaces GPIO..."
    sudo raspi-config nonint do_spi 0 2>/dev/null || true
    sudo raspi-config nonint do_i2c 0 2>/dev/null || true
    print_status "Interfaces GPIO habilitadas"

else
    echo ""
    echo "3️⃣ GPIO no disponible (no es Raspberry Pi) - omitiendo configuración"
fi

# =============================================================================
# 4. Project Setup
# =============================================================================
echo ""
echo "4️⃣ Configurando proyecto..."

# Create necessary directories
print_info "Creando directorios..."
mkdir -p data logs scripts
print_status "Directorios creados"

# Copy environment file
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_status "Archivo .env creado desde .env.example"
        print_warning "Edita .env con tu configuración antes de continuar"
    else
        print_warning "Archivo .env.example no encontrado"
    fi
else
    print_status "Archivo .env ya existe"
fi

# Install Node.js dependencies (if package.json exists)
if [ -f package.json ]; then
    print_info "Instalando dependencias de Node.js..."
    npm install --silent
    print_status "Dependencias de Node.js instaladas"

    # Generate Prisma client
    if [ -f prisma/schema.prisma ]; then
        print_info "Generando cliente Prisma..."
        npx prisma generate
        print_status "Cliente Prisma generado"
    fi
else
    print_warning "package.json no encontrado - omitiendo instalación de dependencias"
fi

# =============================================================================
# 5. Docker Permissions for GPIO
# =============================================================================
if [ "$IS_RASPBERRY_PI" = true ]; then
    echo ""
    echo "5️⃣ Configurando Docker para GPIO..."

    # Create Docker override for GPIO access
    print_info "Creando configuración Docker para GPIO..."

    cat > docker-compose.override.yml << 'EOF'
version: '3.8'

services:
  gpio-controller:
    privileged: true
    group_add:
      - gpio
    devices:
      - /dev/gpiomem:/dev/gpiomem
      - /dev/mem:/dev/mem
    volumes:
      - /sys:/sys:ro
      - /dev:/dev:rw

  gpio-controller-dev:
    privileged: true
    group_add:
      - gpio
    devices:
      - /dev/gpiomem:/dev/gpiomem
      - /dev/mem:/dev/mem
    volumes:
      - /sys:/sys:ro
      - /dev:/dev:rw
EOF

    print_status "Configuración Docker para GPIO creada"
fi

# =============================================================================
# 6. Create Helper Scripts
# =============================================================================
echo ""
echo "6️⃣ Creando scripts auxiliares..."

# Create GPIO test script
cat > scripts/test-gpio.sh << 'EOF'
#!/bin/bash
echo "🧪 Testing GPIO Controller..."

# Test if container is running
if ! docker ps | grep -q gpio-controller; then
    echo "❌ Container not running. Start with:"
    echo "   ./scripts/build.sh development up"
    exit 1
fi

echo "📊 Application Status:"
curl -s http://localhost:3000/status | jq . || curl -s http://localhost:3000/status

echo -e "\n🔘 Testing Switch 1:"
curl -X POST http://localhost:3000/test/switch/0

echo -e "\n🔘 Testing Switch 3:"
curl -X POST http://localhost:3000/test/switch/2

echo -e "\n✅ GPIO test completed!"
EOF

chmod +x scripts/test-gpio.sh
print_status "Script de prueba GPIO creado"

# Create status check script
cat > scripts/check-status.sh << 'EOF'
#!/bin/bash
echo "📊 GPIO Controller Status Check"
echo "==============================="

echo "🐳 Docker Status:"
docker ps --filter "name=gpio" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n🌐 Application Health:"
if curl -s http://localhost:3000/health > /dev/null; then
    curl -s http://localhost:3000/health | jq .
else
    echo "❌ Application not responding"
fi

echo -e "\n⚙️ GPIO Status:"
if curl -s http://localhost:3000/status > /dev/null; then
    curl -s http://localhost:3000/status | jq .
else
    echo "❌ Status endpoint not responding"
fi

echo -e "\n📋 Recent Logs:"
docker compose logs --tail=10 gpio-controller-dev 2>/dev/null || \
docker compose logs --tail=10 gpio-controller 2>/dev/null || \
echo "❌ No logs available"
EOF

chmod +x scripts/check-status.sh
print_status "Script de verificación de estado creado"

# =============================================================================
# 7. Final Verification
# =============================================================================
echo ""
echo "7️⃣ Verificación final..."

# Check GPIO files
if [ "$IS_RASPBERRY_PI" = true ]; then
    print_info "Verificando archivos GPIO..."

    if [ -c /dev/gpiomem ]; then
        GPIOMEM_PERMS=$(ls -la /dev/gpiomem | awk '{print $1, $3, $4}')
        print_status "GPIO memory: $GPIOMEM_PERMS"
    else
        print_error "GPIO memory device no encontrado"
    fi

    if [ -f /sys/class/gpio/export ]; then
        print_status "GPIO export disponible"
    else
        print_error "GPIO export no encontrado"
    fi
fi

# Check Docker
if docker --version > /dev/null 2>&1; then
    DOCKER_VERSION=$(docker --version)
    print_status "Docker: $DOCKER_VERSION"
else
    print_error "Docker no está funcionando"
fi

# =============================================================================
# 8. Summary and Next Steps
# =============================================================================
echo ""
echo "🎉 Setup Completado!"
echo "==================="

if [ "$NEED_REBOOT" = true ]; then
    print_warning "REINICIO REQUERIDO para aplicar cambios de grupos"
    echo ""
    echo "Después del reinicio, ejecuta:"
else
    echo "Próximos pasos:"
fi

echo ""
echo "1️⃣ Editar configuración:"
echo "   nano .env"
echo ""
echo "2️⃣ Construir y ejecutar:"
echo "   ./scripts/build.sh development up"
echo ""
echo "3️⃣ Probar GPIO:"
echo "   ./scripts/test-gpio.sh"
echo ""
echo "4️⃣ Verificar estado:"
echo "   ./scripts/check-status.sh"
echo ""
echo "5️⃣ Ver logs:"
echo "   ./scripts/build.sh development logs"

if [ "$IS_RASPBERRY_PI" = true ]; then
    echo ""
    print_info "GPIO configurado para Docker containers"
    print_info "El sistema funcionará en modo hardware real"
else
    echo ""
    print_info "Sistema configurado en modo simulación"
fi

if [ "$NEED_REBOOT" = true ]; then
    echo ""
    print_warning "¡REINICIA EL SISTEMA AHORA!"
    echo "sudo reboot"
fi

echo ""
print_status "Setup completado exitosamente! 🚀"
