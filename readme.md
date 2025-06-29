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
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

## 🛠️ Instalación

### Método Automático (Recomendado)
```bash
# Hace la instalación automáticamente según el entorno
chmod +x install.sh
./install.sh
```

### Método Manual

#### En Desarrollo (sin hardware GPIO)
```bash
pip install -r requirements-dev.txt
```

#### En Raspberry Pi
```bash
pip install -r requirements-pi.txt
```

#### En Docker
```bash
# Con soporte GPIO
docker build --build-arg INSTALL_GPIO=true -t gpio-controller .

# Sin soporte GPIO (solo simulación)
docker build --build-arg INSTALL_GPIO=false -t gpio-controller .
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

# Conexiones GPIO para Raspberry Pi 4B

Basándome en tu código y la salida de `gpio readall`, aquí están las conexiones que debes hacer en tu Raspberry Pi 4B:

## PINES PARA SWITCHES (Entradas)

Según `SWITCH_PINS = [4, 5, 6, 16, 17, 20, 21, 22, 23, 24, 25]`:

| Switch | GPIO BCM | Pin Físico | Conexión |
|--------|----------|------------|----------|
| Switch 1 | GPIO 4 | Pin 7 | Conectar switch entre Pin 7 y GND |
| Switch 2 | GPIO 5 | Pin 29 | Conectar switch entre Pin 29 y GND |
| Switch 3 | GPIO 6 | Pin 31 | Conectar switch entre Pin 31 y GND |
| Switch 4 | GPIO 16 | Pin 36 | Conectar switch entre Pin 36 y GND |
| Switch 5 | GPIO 17 | Pin 11 | Conectar switch entre Pin 11 y GND |
| Switch 6 | GPIO 20 | Pin 38 | Conectar switch entre Pin 38 y GND |
| Switch 7 | GPIO 21 | Pin 40 | Conectar switch entre Pin 40 y GND |
| Switch 8 | GPIO 22 | Pin 15 | Conectar switch entre Pin 15 y GND |
| Switch 9 | GPIO 23 | Pin 16 | Conectar switch entre Pin 16 y GND |
| Switch 10 | GPIO 24 | Pin 18 | Conectar switch entre Pin 18 y GND |
| Switch 11 | GPIO 25 | Pin 22 | Conectar switch entre Pin 22 y GND |

## PINES PARA BULBOS/LEDs (Salidas)

Según `BULB_PINS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19]`:

| Bulbo | GPIO BCM | Pin Físico | Conexión |
|-------|----------|------------|----------|
| Bulbo 1 | GPIO 7 | Pin 26 | LED/Bulbo + resistencia a GND |
| Bulbo 2 | GPIO 8 | Pin 24 | LED/Bulbo + resistencia a GND |
| Bulbo 3 | GPIO 9 | Pin 21 | LED/Bulbo + resistencia a GND |
| Bulbo 4 | GPIO 10 | Pin 19 | LED/Bulbo + resistencia a GND |
| Bulbo 5 | GPIO 11 | Pin 23 | LED/Bulbo + resistencia a GND |
| Bulbo 6 | GPIO 12 | Pin 32 | LED/Bulbo + resistencia a GND |
| Bulbo 7 | GPIO 13 | Pin 33 | LED/Bulbo + resistencia a GND |
| Bulbo 8 | GPIO 14 | Pin 8 | LED/Bulbo + resistencia a GND |
| Bulbo 9 | GPIO 15 | Pin 10 | LED/Bulbo + resistencia a GND |
| Bulbo 10 | GPIO 18 | Pin 12 | LED/Bulbo + resistencia a GND |
| Bulbo 11 | GPIO 19 | Pin 35 | LED/Bulbo + resistencia a GND |

## PINES DE ALIMENTACIÓN DISPONIBLES

- **3.3V**: Pines 1, 17
- **5V**: Pines 2, 4
- **GND (Tierra)**: Pines 6, 9, 14, 20, 25, 30, 34, 39

## ESQUEMA DE CONEXIÓN

### Para cada Switch:
```
Pin GPIO → Switch → Pin GND
```

### Para cada LED/Bulbo:
```
Pin GPIO → Resistencia (220Ω-1kΩ) → LED → Pin GND
```

## DIAGRAMA VISUAL COMPLETO

```
Raspberry Pi 4B GPIO Layout Completo
=====================================

     3.3V [ 1] [ 2] 5V
   GPIO 2 [ 3] [ 4] 5V
   GPIO 3 [ 5] [ 6] GND          ←─ Switches/LEDs GND
   GPIO 4 [ 7] [ 8] GPIO 14      ←─ Switch 1 | LED 8
      GND [ 9] [10] GPIO 15      ←─          | LED 9
  GPIO 17 [11] [12] GPIO 18      ←─ Switch 5 | LED 10
  GPIO 27 [13] [14] GND          ←─ Switches/LEDs GND
  GPIO 22 [15] [16] GPIO 23      ←─ Switch 8 | Switch 9
     3.3V [17] [18] GPIO 24      ←─ Switch 10
  GPIO 10 [19] [20] GND          ←─ LED 4
   GPIO 9 [21] [22] GPIO 25      ←─ LED 3    | Switch 11
  GPIO 11 [23] [24] GPIO 8       ←─ LED 5    | LED 2
      GND [25] [26] GPIO 7       ←─ LED 1
   GPIO 0 [27] [28] GPIO 1
   GPIO 5 [29] [30] GND          ←─ Switch 2
   GPIO 6 [31] [32] GPIO 12      ←─ Switch 3 | LED 6
  GPIO 13 [33] [34] GND          ←─ LED 7
  GPIO 19 [35] [36] GPIO 16      ←─ LED 11   | Switch 4
  GPIO 26 [37] [38] GPIO 20      ←─ Switch 6
      GND [39] [40] GPIO 21      ←─ Switch 7

PINES UTILIZADOS:
==================
SWITCHES (Entradas - 11 switches):
- Switch 1:  GPIO 4  (Pin 7) 
- Switch 2:  GPIO 5  (Pin 29)  
- Switch 3:  GPIO 6  (Pin 31)
- Switch 4:  GPIO 16 (Pin 36)
- Switch 5:  GPIO 17 (Pin 11)
- Switch 6:  GPIO 20 (Pin 38)
- Switch 7:  GPIO 21 (Pin 40)
- Switch 8:  GPIO 22 (Pin 15)
- Switch 9:  GPIO 23 (Pin 16)
- Switch 10: GPIO 24 (Pin 18)
- Switch 11: GPIO 25 (Pin 22)

BULBOS/LEDs (Salidas - 11 bulbos):
- Bulbo 1:  GPIO 7  (Pin 26)
- Bulbo 2:  GPIO 8  (Pin 24)
- Bulbo 3:  GPIO 9  (Pin 21)
- Bulbo 4:  GPIO 10 (Pin 19)
- Bulbo 5:  GPIO 11 (Pin 23)
- Bulbo 6:  GPIO 12 (Pin 32)
- Bulbo 7:  GPIO 13 (Pin 33)
- Bulbo 8:  GPIO 14 (Pin 8) 
- Bulbo 9:  GPIO 15 (Pin 10)
- Bulbo 10: GPIO 18 (Pin 12)
- Bulbo 11: GPIO 19 (Pin 35)

ALIMENTACIÓN DISPONIBLE:
- 3.3V: Pines 1, 17
- 5V:   Pines 2, 4
- GND:  Pines 6, 9, 14, 20, 25, 30, 34, 39
```

## COMPONENTES RECOMENDADOS

### Para Switches:
- **Botones pulsadores (Push buttons)**
- **Switches táctiles**
- **Micro switches**

### Para Bulbos/LEDs:
- **LEDs estándar**: Resistencia 220Ω - 1kΩ
- **LEDs de alta potencia**: Usar transistores o MOSFETs
- **Bulbos reales**: Usar módulos de relé (5V o 3.3V)

## NOTAS IMPORTANTES

1. **Configuración de Switches**: Tu código usa `pull_up_down=GPIO.PUD_UP`, por lo que detecta cuando el switch se presiona (va de HIGH a LOW)

2. **Resistencias para LEDs**: Usa resistencias apropiadas:
   - LEDs rojos: 220Ω
   - LEDs azules/blancos: 330Ω-1kΩ
   - Ajusta según el voltaje y corriente de tu LED

3. **Bulbos de alta potencia**: Si usas bulbos reales en lugar de LEDs, necesitarás:
   - Módulos de relé para cargas AC
   - Transistores/MOSFETs para cargas DC de alta corriente

4. **GND común**: Todos los switches y LEDs deben compartir el mismo GND

5. **Protección**: Considera agregar resistencias pull-up/pull-down adicionales si experimentas rebotes en los switches

## CÓDIGO DE REFERENCIA

Tu configuración actual en el código:

```python
# Pin constants
SWITCH_PINS = [4, 5, 6, 16, 17, 20, 21, 22, 23, 24, 25]  # GPIO BCM numbers (11 switches)
BULB_PINS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19]    # GPIO BCM numbers (11 bulbs)

# GPIO setup for switches (inputs with pull-up)
GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

# GPIO setup for bulbs (outputs, initially LOW)
GPIO.setup(pin, GPIO.OUT)
GPIO.output(pin, GPIO.LOW)
```

## PRUEBAS

Una vez conectado, puedes probar tu configuración:

1. **Modo Hardware**: Los switches físicos activarán los bulbos
2. **Modo Simulación**: Usa el endpoint `GET /test/switch/{1-11}` para simular presiones de switches

**Total de conexiones**: 11 switches + 11 bulbos = 22 pines GPIO utilizados

---

**⚠️ Advertencia**: Siempre desconecta la alimentación de la Raspberry Pi antes de hacer cambios en las conexiones GPIO.

## 📄 Licencia

Este proyecto está bajo la licencia MIT.