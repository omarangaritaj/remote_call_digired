# Raspberry Pi GPIO Controller

Aplicación FastAPI para controlar interruptores y bombillos en Raspberry Pi con integración a API en la nube.

## 🚀 Características

- **5 Interruptores GPIO** que activan bombillos por 2 segundos
- **5 Bombillos LED** controlados independientemente
- **Peticiones HTTP POST** automáticas a API en la nube
- **Autenticación** con Bearer Token y API Key
- **UUIDs únicos** para cada interruptor
- **Contenedor Docker** para fácil despliegue
- **Variables de entorno** para configuración segura

## 🔧 Hardware Requerido

### Componentes
- Raspberry Pi 4 (o modelo compatible)
- 5 Interruptores (push buttons)
- 5 LEDs
- 5 Resistencias 220Ω (para LEDs)
- Resistencias pull-up internas (configuradas por software)
- Protoboard y cables jumper

### Conexiones GPIO

#### Interruptores (con pull-up interno)
- **Interruptor 1**: GPIO 2 → GND
- **Interruptor 2**: GPIO 3 → GND  
- **Interruptor 3**: GPIO 4 → GND
- **Interruptor 4**: GPIO 17 → GND
- **Interruptor 5**: GPIO 27 → GND

#### Bombillos LED
- **LED 1**: GPIO 18 → Resistencia 220Ω → LED → GND
- **LED 2**: GPIO 23 → Resistencia 220Ω → LED → GND
- **LED 3**: GPIO 24 → Resistencia 220Ω → LED → GND
- **LED 4**: GPIO 25 → Resistencia 220Ω → LED → GND
- **LED 5**: GPIO 8 → Resistencia 220Ω → LED → GND

## 📦 Instalación

### 1. Clonar o descargar los archivos
```bash
# Crear directorio del proyecto
mkdir raspberry-gpio-controller
cd raspberry-gpio-controller

# Copiar todos los archivos del proyecto aquí
```

### 2. Ejecutar script de configuración
```bash
chmod +x setup.sh
./setup.sh
```

### 3. Configurar variables de entorno
```bash
# Editar archivo .env con tus credenciales
nano .env
```

Ejemplo de configuración:
```env
API_URL=https://tu-api.ejemplo.com/switches
API_KEY=tu-api-key-secreta
API_TOKEN=tu-bearer-token-jwt
DEVICE_ID=raspberry-pi-sala-principal
```

### 4. Construir y ejecutar
```bash
# Construir imagen Docker
docker-compose build

# Ejecutar en background
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f
```

## 🔑 UUIDs de Interruptores

Cada interruptor tiene un UUID único predefinido:

- **Interruptor 1**: `550e8400-e29b-41d4-a716-446655440001`
- **Interruptor 2**: `550e8400-e29b-41d4-a716-446655440002`
- **Interruptor 3**: `550e8400-e29b-41d4-a716-446655440003`
- **Interruptor 4**: `550e8400-e29b-41d4-a716-446655440004`
- **Interruptor 5**: `550e8400-e29b-41d4-a716-446655440005`

## 📡 API Integration

### Formato de Petición POST

```json
{
  "device_id": "raspberry-pi-001",
  "switch_uuid": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2025-06-06T15:30:45Z",
  "status": "activated"
}
```

### Headers HTTP
```
Content-Type: application/json
Authorization: Bearer {API_TOKEN}
X-API-Key: {API_KEY}
User-Agent: RaspberryPi-GPIO-Controller/1.0
```

## 🌐 Endpoints FastAPI

### Información del Sistema
- `GET /` - Estado general del controlador
- `GET /status` - Estado detallado de interruptores
- `GET /health` - Verificación de salud

### Testing Manual
- `POST /test/switch/{switch_index}` - Probar interruptor manualmente

Ejemplo:
```bash
curl -X POST http://localhost:8000/test/switch/0
```

## 🐳 Comandos Docker

```bash
# Ver logs
docker-compose logs -f

# Reiniciar servicio
docker-compose restart

# Detener servicio
docker-compose down

# Reconstruir imagen
docker-compose build --no-cache

# Estado del contenedor
docker-compose ps
```

## 🔧 Troubleshooting

### Problemas GPIO
```bash
# Verificar permisos GPIO
ls -l /dev/gpiomem

# Agregar usuario a grupo gpio
sudo usermod -a -G gpio $USER

# Reiniciar para aplicar cambios
sudo reboot
```

### Problemas de Red
```bash
# Verificar conectividad
ping 8.8.8.8

# Probar API endpoint
curl -X POST https://tu-api.com/endpoint \
  -H "Authorization: Bearer tu-token" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Logs Detallados
```bash
# Ver logs completos
docker-compose logs --tail=100 -f

# Entrar al contenedor
docker-compose exec gpio-controller bash
```

## 🔒 Seguridad

- ✅ Credenciales en variables de entorno
- ✅ Usuario no-root en contenedor
- ✅ Timeouts en peticiones HTTP
- ✅ Validación de entrada
- ✅ Logging de eventos

## 📊 Monitoreo

La aplicación proporciona logs detallados para:
- Activación de interruptores
- Estado de bombillos
- Peticiones HTTP exitosas/fallidas
- Errores de GPIO o red

## 🔄 Actualización

```bash
# Detener servicio
docker-compose down

# Actualizar código
# (copiar nuevos archivos)

# Reconstruir y reiniciar
docker-compose build
docker-compose up -d
```