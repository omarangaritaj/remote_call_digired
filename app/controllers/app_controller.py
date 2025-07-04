# app/controllers/app_controller.py

import time
import psutil
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Path

from app.constants.pin_constants import BULB_PINS, SWITCH_PINS
from app.models.models import ApplicationInfo, HealthCheck, GPIOStatus
from app.core.config import settings

router = APIRouter()


@router.get("/", response_model = ApplicationInfo)
async def get_root():
    """Get application information"""
    return ApplicationInfo(
        message = "Raspberry Pi GPIO Controller",
        version = "1.0.0",
        device_id = settings.device_id,
        switches = len(SWITCH_PINS),
        bulbs = len(BULB_PINS),
        status = "running",
        timestamp = datetime.now().isoformat()
    )


@router.get("/health", response_model = HealthCheck)
async def get_health():
    """Get application health status"""
    process = psutil.Process()
    memory_info = process.memory_info()

    return HealthCheck(
        status = "healthy",
        timestamp = datetime.now().isoformat(),
        uptime = time.time() - process.create_time(),
        memory = {
            "rss": memory_info.rss,
            "vms": memory_info.vms,
            "percent": process.memory_percent()
        }
    )


@router.get("/status", response_model = GPIOStatus)
async def get_status(request: Request):
    """Get GPIO service status"""
    gpio_service = request.app.state.gpio_service
    status_data = gpio_service.get_status()
    return GPIOStatus(**status_data)


@router.get("/test/switch/{index}")
async def test_switch(
        request: Request,
        index: int = Path(..., ge = 1, le = len(SWITCH_PINS), description = f"Switch index (1-{len(SWITCH_PINS)})")
):
    """Test switch press simulation"""
    gpio_service = request.app.state.gpio_service
    try:
        result = await gpio_service.handle_switch_press(index)
        return {
            "message": f"Switch {index} test completed",
            "result": result
        }
    except Exception as error:
        raise HTTPException(status_code = 400, detail = str(error))
