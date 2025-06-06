import asyncio
import os
import uuid
from datetime import datetime
from typing import Dict, Optional
import httpx
import RPi.GPIO as GPIO
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging
from contextlib import asynccontextmanager

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración de GPIO
SWITCH_PINS = [2, 3, 4, 17, 27]  # Pines GPIO para interruptores
BULB_PINS = [18, 23, 24, 25, 8]   # Pines GPIO para bombillos

# UUIDs estáticos para cada interruptor
SWITCH_UUIDS = {
    0: "550e8400-e29b-41d4-a716-446655440001",
    1: "550e8400-e29b-41d4-a716-446655440002",
    2: "550e8400-e29b-41d4-a716-446655440003",
    3: "550e8400-e29b-41d4-a716-446655440004",
    4: "550e8400-e29b-41d4-a716-446655440005"
}

# Variables de entorno
API_URL = os.getenv("API_URL", "https://api.ejemplo.com/endpoint")
API_KEY = os.getenv("API_KEY", "")
API_TOKEN = os.getenv("API_TOKEN", "")
DEVICE_ID = os.getenv("DEVICE_ID", "raspberry-pi-001")

class SwitchEvent(BaseModel):
    device_id: str
    switch_uuid: str
    timestamp: str
    status: str = "activated"

class GPIOController:
    def __init__(self):
        self.switch_states = [False] * 5
        self.bulb_tasks = {}
        self.setup_gpio()

    def setup_gpio(self):
        """Configuración inicial de GPIO"""
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)

        # Configurar pines de interruptores como entrada con pull-up
        for pin in SWITCH_PINS:
            GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

        # Configurar pines de bombillos como salida
        for pin in BULB_PINS:
            GPIO.setup(pin, GPIO.OUT)
            GPIO.output(pin, GPIO.LOW)

        logger.info("GPIO configurado correctamente")

    async def turn_on_bulb(self, bulb_index: int):
        """Enciende un bombillo por 2 segundos"""
        try:
            pin = BULB_PINS[bulb_index]
            GPIO.output(pin, GPIO.HIGH)
            logger.info(f"Bombillo {bulb_index + 1} encendido")

            await asyncio.sleep(2)

            GPIO.output(pin, GPIO.LOW)
            logger.info(f"Bombillo {bulb_index + 1} apagado")

        except Exception as e:
            logger.error(f"Error controlando bombillo {bulb_index + 1}: {e}")

    async def send_api_request(self, switch_index: int):
        """Envía petición POST a la API en la nube"""
        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_TOKEN}",
                "X-API-Key": API_KEY,
                "User-Agent": "RaspberryPi-GPIO-Controller/1.0"
            }

            payload = SwitchEvent(
                device_id=DEVICE_ID,
                switch_uuid=SWITCH_UUIDS[switch_index],
                timestamp=datetime.utcnow().isoformat() + "Z"
            )

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    API_URL,
                    json=payload.dict(),
                    headers=headers
                )

                if response.status_code == 200:
                    logger.info(f"Petición API exitosa para interruptor {switch_index + 1}")
                else:
                    logger.warning(f"API respondió con código {response.status_code} para interruptor {switch_index + 1}")

        except httpx.TimeoutException:
            logger.error(f"Timeout en petición API para interruptor {switch_index + 1}")
        except Exception as e:
            logger.error(f"Error en petición API para interruptor {switch_index + 1}: {e}")

    async def handle_switch_press(self, switch_index: int):
        """Maneja la presión de un interruptor"""
        logger.info(f"Interruptor {switch_index + 1} presionado")

        # Crear tareas concurrentes para bombillo y API
        bulb_task = asyncio.create_task(self.turn_on_bulb(switch_index))
        api_task = asyncio.create_task(self.send_api_request(switch_index))

        # Ejecutar ambas tareas en paralelo
        await asyncio.gather(bulb_task, api_task, return_exceptions=True)

    async def monitor_switches(self):
        """Monitorea continuamente el estado de los interruptores"""
        logger.info("Iniciando monitoreo de interruptores...")

        while True:
            try:
                for i, pin in enumerate(SWITCH_PINS):
                    current_state = not GPIO.input(pin)  # Invertir porque usamos pull-up

                    # Detectar flanco de subida (interruptor presionado)
                    if current_state and not self.switch_states[i]:
                        self.switch_states[i] = True
                        await self.handle_switch_press(i)
                    elif not current_state:
                        self.switch_states[i] = False

                await asyncio.sleep(0.1)  # Pequeña pausa para evitar rebotes

            except Exception as e:
                logger.error(f"Error en monitoreo de interruptores: {e}")
                await asyncio.sleep(1)

    def cleanup(self):
        """Limpia la configuración GPIO"""
        GPIO.cleanup()
        logger.info("GPIO limpiado")

# Instancia global del controlador GPIO
gpio_controller = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Maneja el ciclo de vida de la aplicación"""
    global gpio_controller

    # Startup
    logger.info("Iniciando aplicación GPIO Controller...")
    gpio_controller = GPIOController()

    # Iniciar el monitoreo de interruptores en background
    monitor_task = asyncio.create_task(gpio_controller.monitor_switches())

    try:
        yield
    finally:
        # Shutdown
        logger.info("Cerrando aplicación...")
        monitor_task.cancel()
        if gpio_controller:
            gpio_controller.cleanup()

# Crear aplicación FastAPI
app = FastAPI(
    title="Raspberry Pi GPIO Controller",
    description="Control de interruptores y bombillos con integración API",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/")
async def root():
    """Endpoint de salud"""
    return {
        "message": "GPIO Controller running",
        "device_id": DEVICE_ID,
        "switches": len(SWITCH_PINS),
        "bulbs": len(BULB_PINS)
    }

@app.get("/status")
async def get_status():
    """Obtiene el estado actual del sistema"""
    if not gpio_controller:
        raise HTTPException(status_code=500, detail="GPIO Controller not initialized")

    return {
        "switch_states": gpio_controller.switch_states,
        "switch_pins": SWITCH_PINS,
        "bulb_pins": BULB_PINS,
        "switch_uuids": SWITCH_UUIDS
    }

@app.post("/test/switch/{switch_index}")
async def test_switch(switch_index: int):
    """Endpoint para probar un interruptor manualmente"""
    if switch_index < 0 or switch_index >= len(SWITCH_PINS):
        raise HTTPException(status_code=400, detail="Switch index out of range")

    if not gpio_controller:
        raise HTTPException(status_code=500, detail="GPIO Controller not initialized")

    await gpio_controller.handle_switch_press(switch_index)
    return {"message": f"Switch {switch_index + 1} test completed"}

@app.get("/health")
async def health_check():
    """Endpoint de verificación de salud"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
