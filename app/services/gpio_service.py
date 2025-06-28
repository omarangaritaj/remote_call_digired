# app/services/gpio_service.py

import asyncio
import os
from datetime import datetime
from typing import List, Dict, Any
from loguru import logger

from app.constants.pin_constants import SWITCH_PINS, BULB_PINS
from app.models.models import SwitchEventPayload, UserLocation
from app.services.api_service import ApiService
from app.services.user_service import UserService
from app.core.config import settings

try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
    logger.info("📦 RPi.GPIO library loaded successfully")
except ImportError:
    GPIO_AVAILABLE = False
    logger.warning("⚠️ RPi.GPIO not available - running in simulation mode")
    logger.info("💡 This is normal on non-Raspberry Pi systems")

    # Create a mock GPIO class for development
    class MockGPIO:
        BCM = "BCM"
        IN = "IN"
        OUT = "OUT"
        HIGH = 1
        LOW = 0
        PUD_UP = "PUD_UP"

        @staticmethod
        def setmode(mode): pass
        @staticmethod
        def setwarnings(warnings): pass
        @staticmethod
        def setup(pin, mode, pull_up_down=None): pass
        @staticmethod
        def input(pin): return 0
        @staticmethod
        def output(pin, value): pass
        @staticmethod
        def cleanup(): pass

    GPIO = MockGPIO()


class GPIOService:
    def __init__(self):
        self.api_service = ApiService()
        self.user_service = UserService()

        # GPIO state
        self.gpio_available = False
        self.is_monitoring = False
        self.switch_states = [False] * 5

        # Monitoring tasks
        self.monitoring_tasks: List[asyncio.Task] = []

    async def initialize(self) -> None:
        """Initialize GPIO service"""
        try:
            logger.info("🔍 Checking GPIO availability...")

            # Check GPIO availability first
            self.gpio_available = await self._check_gpio_availability()

            if not self.gpio_available:
                logger.warning("⚠️ GPIO hardware not available - activating simulation mode")
                logger.info("💡 Test switches using: GET /test/switch/{1-5}")
                logger.info("🔧 All GPIO operations will be simulated")
                return

            logger.info("🔌 GPIO hardware detected - initializing physical pins...")
            await self._initialize_hardware()
            logger.info("✅ GPIO hardware initialization completed")

        except Exception as error:
            logger.error(f"❌ GPIO initialization failed: {error}")
            self.gpio_available = False
            logger.warning("🔄 Falling back to simulation mode due to hardware error")
            await self.cleanup()

    async def _initialize_hardware(self) -> None:
        """Initialize GPIO hardware"""
        if not GPIO_AVAILABLE:
            return

        # Setup GPIO mode
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)

        # Initialize switch pins (input with pull-up)
        for i, pin in enumerate(SWITCH_PINS):
            try:
                GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
                logger.info(f"✅ Switch {i + 1} initialized on GPIO {pin}")
            except Exception as error:
                logger.error(f"❌ Failed to initialize switch {i + 1} on GPIO {pin}: {error}")
                raise

        # Initialize bulb pins (output)
        for i, pin in enumerate(BULB_PINS):
            try:
                GPIO.setup(pin, GPIO.OUT)
                GPIO.output(pin, GPIO.LOW)  # Initially off
                logger.info(f"✅ Bulb {i + 1} initialized on GPIO {pin}")
            except Exception as error:
                logger.error(f"❌ Failed to initialize bulb {i + 1} on GPIO {pin}: {error}")
                raise

    async def _check_gpio_availability(self) -> bool:
        """Check if GPIO is available"""
        try:
            if not GPIO_AVAILABLE:
                return False

            # Check if running in Docker
            is_docker = self._is_running_in_docker()
            if is_docker:
                logger.info("🐋 Running in Docker container")

            # Check basic GPIO requirements
            has_gpio_export = os.path.exists("/sys/class/gpio/export")
            has_gpio_mem = os.path.exists("/dev/gpiomem")
            has_device_tree = os.path.exists("/proc/device-tree/model")

            logger.info(f"🔍 GPIO Check - Export: {has_gpio_export}, Memory: {has_gpio_mem}, DeviceTree: {has_device_tree}")

            if not has_gpio_export or not has_gpio_mem:
                return False

            # Check if it's actually a Raspberry Pi
            if has_device_tree:
                try:
                    with open("/proc/device-tree/model", "r") as f:
                        model = f.read().strip()

                    is_raspberry_pi = "Raspberry Pi" in model
                    logger.info(f"📱 Device: {model}")
                    logger.info(f"🍓 Is Raspberry Pi: {is_raspberry_pi}")

                    if not is_raspberry_pi and not is_docker:
                        return False

                except Exception as error:
                    logger.warning(f"⚠️ Could not read device model: {error}")

            # Test GPIO access
            try:
                # Test if we can access GPIO (this will fail if not on Pi or in Docker without privileges)
                GPIO.setmode(GPIO.BCM)
                GPIO.setwarnings(False)
                logger.info("✅ GPIO access test successful")
                return True

            except Exception as error:
                logger.warning(f"⚠️ GPIO access test failed: {error}")
                return False

        except Exception as error:
            logger.warning(f"⚠️ GPIO availability check failed: {error}")
            return False

    def _is_running_in_docker(self) -> bool:
        """Check if running in Docker container"""
        try:
            # Check for .dockerenv file
            if os.path.exists("/.dockerenv"):
                return True

            # Check cgroup
            with open("/proc/1/cgroup", "r") as f:
                cgroup = f.read()

            return "docker" in cgroup or "containerd" in cgroup

        except Exception:
            return False

    async def start_monitoring(self) -> None:
        """Start GPIO monitoring"""
        if self.is_monitoring:
            logger.warning("⚠️ GPIO monitoring already active")
            return

        logger.info("🚀 Starting GPIO monitoring...")
        self.is_monitoring = True

        if not self.gpio_available:
            logger.info("📝 SIMULATION MODE: GPIO monitoring active")
            logger.info("🧪 Test endpoints: GET /test/switch/{1-5}")
            return

        # Start monitoring task for each switch
        for i in range(len(SWITCH_PINS)):
            task = asyncio.create_task(self._monitor_switch(i))
            self.monitoring_tasks.append(task)

        logger.info("✅ HARDWARE MODE: Physical GPIO monitoring active")

    async def _monitor_switch(self, switch_index: int) -> None:
        """Monitor a specific switch for state changes"""
        if not GPIO_AVAILABLE:
            return

        pin = SWITCH_PINS[switch_index]
        previous_state = GPIO.input(pin)

        while self.is_monitoring:
            try:
                current_state = GPIO.input(pin)

                # Detect rising edge (button press)
                if previous_state == GPIO.HIGH and current_state == GPIO.LOW:
                    await self.handle_switch_press(switch_index + 1)

                previous_state = current_state
                await asyncio.sleep(0.01)  # 10ms polling interval

            except Exception as error:
                logger.error(f"❌ Error monitoring switch {switch_index + 1}: {error}")
                break

    async def handle_switch_press(self, switch_index: int) -> Dict[str, Any]:
        """Handle switch press event"""
        if switch_index <= 0 or switch_index > len(SWITCH_PINS):
            raise ValueError(f"Invalid switch position: {switch_index}")

        logger.info(f"🔘 Switch {switch_index} activated")

        try:
            # Execute bulb control and API request concurrently
            bulb_task = asyncio.create_task(self._turn_on_bulb(switch_index - 1))
            api_task = asyncio.create_task(self._send_api_request(SWITCH_PINS[switch_index - 1]))

            bulb_result, api_result = await asyncio.gather(bulb_task, api_task)

            return {
                "turnOnBulb": bulb_result,
                "sendApiRequest": api_result
            }

        except Exception as error:
            logger.error(f"❌ Error handling switch press: {error}")
            raise

    async def _turn_on_bulb(self, bulb_index: int) -> Dict[str, Any]:
        bulb = bulb_index + 1

        """Turn on bulb for 2 seconds"""
        try:
            if not self.gpio_available:
                # Simulation mode
                logger.info(f"🔧 SIMULATION: Bulb {bulb} → ON")
                await asyncio.sleep(0.1)
                logger.info(f"💡 SIMULATION: Bulb {bulb} illuminated (2s)")
                await asyncio.sleep(settings.time_on_bulb)
                logger.info(f"🔧 SIMULATION: Bulb {bulb} → OFF")
                return {"simulated": True, "bulb": bulb}

            # Hardware mode
            if not GPIO_AVAILABLE:
                return {"error": "GPIO not available"}

            pin = BULB_PINS[bulb_index]

            GPIO.output(pin, GPIO.HIGH)
            logger.info(f"💡 HARDWARE: Bulb {bulb} → ON (GPIO {pin})")

            await asyncio.sleep(settings.time_on_bulb)

            GPIO.output(pin, GPIO.LOW)
            logger.info(f"💡 HARDWARE: Bulb {bulb} → OFF (GPIO {pin})")

            return {"hardware": True, "bulb": bulb, "gpio": pin}

        except Exception as error:
            logger.error(f"❌ Error controlling bulb {bulb}: {error}")
            return {"error": str(error)}

    async def _send_api_request(self, switch_index: int) -> Dict[str, Any]:
        """Send API request for switch press"""
        try:
            user = self.user_service.get_user(switch_index)

            if not user:
                logger.error(f"❌ No user found for switch pin {switch_index}")
                return {"error": "No user found"}

            payload = SwitchEventPayload(
                status="calling",
                branchId=settings.device_id,
                isMultiService=False,
                location=UserLocation(**user["location"])
            )

            logger.info(f"📡 API: Sending request for switch pin {switch_index} (user: {user['userId']})")
            response = await self.api_service.send_switch_event(payload, user["accessToken"])

            logger.info(f"✅ API: Request completed for switch pin {switch_index}")
            return response.get("data", response)

        except Exception as error:
            logger.error(f"❌ API: Failed for switch pin {switch_index}: {error}")
            raise

    def get_status(self) -> Dict[str, Any]:
        """Get GPIO service status"""
        return {
            "gpioAvailable": self.gpio_available,
            "mode": "hardware" if self.gpio_available else "simulation",
            "isMonitoring": self.is_monitoring,
            "isDocker": self._is_running_in_docker(),
            "switchStates": self.switch_states,
            "switchPins": SWITCH_PINS,
            "bulbPins": BULB_PINS,
            "switchCount": len(SWITCH_PINS),
            "bulbCount": len(BULB_PINS),
            "timestamp": datetime.now().isoformat(),
            "systemInfo": {
                "hasGpioExport": os.path.exists("/sys/class/gpio/export"),
                "hasGpioMem": os.path.exists("/dev/gpiomem"),
                "hasDeviceTree": os.path.exists("/proc/device-tree/model"),
            }
        }

    async def cleanup(self) -> None:
        """Cleanup GPIO resources"""
        logger.info("🧹 Cleaning up GPIO resources...")
        self.is_monitoring = False

        # Cancel monitoring tasks
        for task in self.monitoring_tasks:
            if not task.done():
                task.cancel()

        if self.monitoring_tasks:
            await asyncio.gather(*self.monitoring_tasks, return_exceptions=True)

        self.monitoring_tasks.clear()

        if not self.gpio_available or not GPIO_AVAILABLE:
            logger.info("✅ Cleanup completed (simulation mode)")
            return

        try:
            # Turn off all bulbs
            for i, pin in enumerate(BULB_PINS):
                try:
                    GPIO.output(pin, GPIO.LOW)
                    logger.info(f"✅ Bulb {i + 1} turned off")
                except Exception as error:
                    logger.error(f"⚠️ Error turning off bulb {i + 1}: {error}")

            # Cleanup GPIO
            GPIO.cleanup()
            logger.info("✅ Hardware cleanup completed")

        except Exception as error:
            logger.error(f"⚠️ Error during GPIO cleanup: {error}")
