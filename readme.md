# Raspberry Pi GPIO Controller (FastAPI)

Un controlador GPIO para Raspberry Pi 4B desarrollado con FastAPI que gestiona switches físicos y bombillas LED, con integración a API externa y base de datos SQLite.

## 🚀 Características

- **Control GPIO**: Manejo de 5 switches de entrada y 5 LEDs de salida
- **Modo Simulación**: Funciona sin hardware GPIO para desarrollo y testing
- **API REST**: Endpoints para control y monitoreo
- **Base de Datos**: Gestión de usuarios con SQLite
- **Monitoreo en Tiempo Real**: Detección de eventos GPIO asíncrona
- **Docker Support**: Contenedorización completa
- **Logging Avanzado**: Logs estructurados con Loguru

## 📋 Prerequisitos

### Hardware
- Raspberry Pi 4B
- 5 switches/botones conectados a GPIO pins: 3, 4, 17, 27, 22
- 5 LEDs conectados a GPIO pins: 18, 23, 24, 25, 8
- Resistencias apropiadas para LEDs y pull-up para switches

### Software
- Python 3.11+
- RPi.GPIO (solo en Raspberry Pi)
- SQLite

## 🛠️ Instalación

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd gpio-controller-fastapi
```

### 2. Crear entorno virtual
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus valores
```

### 5. Crear directorio de datos
```bash
mkdir -p data
```

## 🏃‍♂️ Ejecución

### Desarrollo
```bash
python run_dev.py
```

### Producción
```bash
python main.py
```

### Con Docker
```bash
# Construir imagen
docker build -t gpio-controller .

# Ejecutar contenedor
docker run -p 3000:3000 \
  --privileged \
  --device /dev/gpiomem \
  -v $(pwd)/data:/app/data \
  -v /sys:/sys:ro \
  -v /dev:/dev \
  --env-file .env \
  gpio-controller
```

### Con Docker Compose
```bash
docker-compose up -d
```

## 📡 API Endpoints

### Información General
- `GET /` - Información de la aplicación
- `GET /health` - Estado de salud del sistema
- `GET /status` - Estado del servicio GPIO

### Testing
- `GET /test/switch/{1-5}` - Simular presión de switch

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `API_URL` | URL de la API externa | - |
| `API_ENDPOINT` | Endpoint de la API | - |
| `DEVICE_ID` | ID del dispositivo | `raspberry-pi-001` |
| `COMPANY_ID` | ID de la compañía | - |
| `DATABASE_URL` | URL de la base de datos | `sqlite:///./data/dev.db` |
| `PORT` | Puerto del servidor | `3000` |
| `ENVIRONMENT` | Entorno de ejecución | `development` |
| `ENABLE_GPIO` | Habilitar GPIO | `true` |

### Configuración GPIO

Los pines están definidos en `app/constants/pin_constants.py`:

```python
SWITCH_PINS = [3, 4, 17, 27, 22]
BULB_PINS = [18, 23, 24, 25, 8]
```

## 🏗️ Arquitectura

```
app/
├── constants/          # Constantes del proyecto
│   └── pin_constants.py
├── controllers/        # Controladores HTTP
│   └── app_controller.py
├── core/              # Configuración central
│   ├── config.py
│   └── database.py
├── models/            # Modelos Pydantic
│   └── models.py
└── services/          # Lógica de negocio
    ├── api_service.py
    ├── gpio_service.py
    └── user_service.py
```

## 🔄 Flujo de Trabajo

1. **Inicialización**:
    - Verificación de hardware GPIO
    - Conexión a base de datos
    - Sincronización de usuarios desde API
    - Inicio de monitoreo GPIO

2. **Detección de Evento**:
    - Switch presionado → GPIO interrupt
    - Activación de LED correspondiente (2 segundos)
    - Envío de evento a API externa

3. **Modo Simulación**:
    - Sin hardware GPIO disponible
    - Endpoints de testing funcionales
    - Logs de simulación detallados

## 🐛 Debugging

### Logs
Los logs incluyen emojis para fácil identificación:
- 🚀 Inicialización
- ✅ Éxito
- ❌ Error
- ⚠️ Advertencia
- 🔘 Evento de switch
- 💡 Control de LED
- 📡 Comunicación API

### Modo Simulación
Si GPIO no está disponible:
```bash
# Usar endpoints de testing
curl http://localhost:3000/test/switch/1
curl http://localhost:3000/test/switch/2
# ... etc
```

### Verificar Estado
```bash
curl http://localhost:3000/status
```

## 🔒 Consideraciones de Seguridad

- El contenedor Docker requiere modo privilegiado para acceso GPIO
- Las credenciales de API se manejan via variables de entorno
- SQLite local para almacenamiento de tokens de acceso


## 🚀 Producción

### Recomendaciones:
1. Usar un reverse proxy (nginx)
2. Configurar log rotation
3. Implementar health checks
4. Usar variables de entorno para secrets
5. Configurar restart automático del servicio

### Systemd Service (opcional):
```ini
[Unit]
Description=GPIO Controller FastAPI
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/gpio-controller-fastapi
Environment=PATH=/home/pi/gpio-controller-fastapi/venv/bin
ExecStart=/home/pi/gpio-controller-fastapi/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

## 📄 Licencia

Este proyecto está bajo la licencia MIT.