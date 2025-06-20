# Raspberry Pi GPIO Controller (NestJS)

Un controlador GPIO avanzado para Raspberry Pi construido con NestJS que maneja interruptores, bombillos y sincronización con API en la nube.

## 🚀 Características

- **Control GPIO**: Manejo de 5 interruptores y 5 bombillos
- **Sincronización API**: Comunicación con APIs en la nube
- **Base de Datos**: SQLite con Prisma ORM
- **Contenedorización**: Completamente dockerizado
- **Monitoreo**: Endpoints de estado y salud
- **Logging**: Sistema de logs estructurado

## 📋 Requisitos

- Raspberry Pi 3/4/5
- Docker y Docker Compose
- Node.js 18+ (para desarrollo local)
- GPIO habilitado en la Raspberry Pi

## 🔧 Instalación

### Opción 1: Con Docker (Recomendado)

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd raspberry-gpio-controller
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tu configuración
nano .env
```

3. **Ejecutar script de configuración**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

4. **Configurar permisos GPIO**
```bash
chmod +x scripts/fix_gpio_permissions.sh
sudo ./scripts/fix_gpio_permissions.sh
sudo reboot
```

5. **Levantar con Docker**
```bash
docker-compose up -d
```

### Opción 2: Instalación Local

1. **Instalar dependencias**
```bash
npm install
```

2. **Configurar base de datos**
```bash
npx prisma generate
npx prisma migrate deploy
```

3. **Construir aplicación**
```bash
npm run build
```

4. **Ejecutar**
```bash
npm run start:prod
```

## ⚙️ Configuración

### Variables de Entorno

```bash
# Base de datos
DATABASE_URL="file:./data/dev.db"

# Configuración API
API_URL="https://tu-api.com"
API_ENDPOINT="/users"

# Configuración del dispositivo
DEVICE_ID="raspberry-pi-001"

# Aplicación
NODE_ENV="production"
PORT=3000
```

### Pines GPIO

**Interruptores (Entrada con Pull-up):**
- Switch 1: GPIO 2
- Switch 2: GPIO 3
- Switch 3: GPIO 4
- Switch 4: GPIO 17
- Switch 5: GPIO 27

**Bombillos (Salida):**
- Bulb 1: GPIO 18
- Bulb 2: GPIO 23
- Bulb 3: GPIO 24
- Bulb 4: GPIO 25
- Bulb 5: GPIO 8

## 🔌 Conexiones Hardware

### Interruptores
```
Interruptor -> GPIO Pin -> Ground
     |
   3.3V (con resistencia pull-up interna)
```

### Bombillos/LEDs
```
GPIO Pin -> Resistencia (220Ω) -> LED -> Ground
```

## 📡 API Endpoints

### Status y Salud
- `GET /` - Información de la aplicación
- `GET /health` - Estado de salud del sistema
- `GET /status` - Estado de GPIO y monitoreo

### Testing
- `POST /test/switch/{index}` - Probar interruptor manualmente

### Ejemplos de Respuesta

```json
// GET /status
{
  "isMonitoring": true,
  "switchStates": [false, false, false, false, false],
  "switchPins": [2, 3, 4, 17, 27],
  "bulbPins": [18, 23, 24, 25, 8],
  "switchCount": 5,
  "bulbCount": 5,
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## 🗄️ Base de Datos

### Esquema SQLite

```sql
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "location" TEXT NOT NULL,  -- JSON string
    "accessToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
```

### Gestión de Datos

Los usuarios se sincronizan automáticamente desde la API al iniciar la aplicación. La estructura esperada de la API:

```json
{
  "users": [
    {
      "id": "66f1dcbca0a7bbf861f3c66c",
      "branchId": "662ec773e15445c6d88a3025",
      "location": {
        "name": "módulo",
        "id": "6520c3e9ef6846df254baa73",
        "number": 1
      },
      "accessToken": "XXXXXXXXXXXXXX"
    }
  ]
}
```

## 🔄 Funcionamiento

1. **Inicialización**: 
   - Configura GPIO
   - Sincroniza usuarios desde API
   - Inicia monitoreo de interruptores

2. **Evento de Interruptor**:
   - Detecta presión del interruptor
   - Enciende bombillo por 2 segundos
   - Envía petición POST a API en paralelo

3. **Petición API**:
   - Selecciona usuario aleatorio de la BD
   - Usa su accessToken para autenticación
   - Envía datos del evento

## 🐳 Docker

### Construcción
```bash
docker build -t raspberry-gpio-controller .
```

### Ejecución
```bash
docker run -d \
  --name gpio-controller \
  --privileged \
  -p 3000:3000 \
  -v /sys:/sys \
  -v /dev:/dev \
  --device /dev/gpiomem:/dev/gpiomem \
  raspberry-gpio-controller
```

## 🔍 Troubleshooting

### Problemas de GPIO

1. **Error de permisos**:
```bash
sudo ./scripts/fix_gpio_permissions.sh
sudo reboot
```

2. **GPIO ya en uso**:
```bash
# Verificar procesos usando GPIO
sudo lsof /dev/gpiomem
```

3. **Contenedor sin privilegios**:
```bash
# Asegurar que el contenedor tenga privilegios
docker run --privileged ...
```

### Problemas de Base de Datos

1. **Error de migración**:
```bash
npx prisma migrate reset
npx prisma migrate deploy
```

2. **Problemas de permisos**:
```bash
chmod 666 data/dev.db
```

## 📊 Monitoreo

### Logs
```bash
# Ver logs en tiempo real
docker-compose logs -f gpio-controller

# Logs específicos
docker logs raspberry-gpio-controller-nestjs
```

### Métricas
- Estado de GPIO: `GET /status`
- Salud del sistema: `GET /health`
- Información general: `GET /`

## 🛠️ Desarrollo

### Scripts Disponibles
```bash
npm run start:dev    # Desarrollo con hot reload
npm run build        # Construir aplicación
npm run test         # Ejecutar tests
npm run lint         # Verificar código
```

### Estructura del Proyecto
```
src/
├── main.ts              # Punto de entrada
├── app.module.ts        # Módulo principal
├── app.controller.ts    # Controlador principal
├── app.service.ts       # Servicio principal
├── gpio/
│   └── gpio.service.ts  # Servicio GPIO
├── user/
│   └── user.service.ts  # Servicio de usuarios
├── api/
│   └── api.service.ts   # Servicio API
└── prisma/
    └── prisma.service.ts # Servicio Prisma
```

## 📄 Licencia

MIT License - ver archivo LICENSE para detalles.

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📞 Soporte

Para soporte técnico, crear un issue en el repositorio o contactar al equipo de desarrollo.