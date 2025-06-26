// src/gpio/gpio.service.ts

import {BadRequestException, HttpStatus, Injectable, Logger, OnModuleDestroy, UnauthorizedException} from '@nestjs/common';
import { Gpio } from 'onoff';
import { ApiService } from '../api/api.service';
import { UserService } from '../user/user.service';
import { BULB_PINS, SWITCH_PINS } from '../constants/pin.constants';
import * as fs from 'fs';

@Injectable()
export class GPIOService implements OnModuleDestroy {
  private readonly logger = new Logger(GPIOService.name);

  // GPIO instances
  private switches: Gpio[] = [];
  private bulbs: Gpio[] = [];

  // State tracking
  private switchStates: boolean[] = new Array(5).fill(false);
  private isMonitoring = false;
  private monitoringIntervals: ReturnType<typeof setTimeout>[] = [];
  private gpioAvailable = false;

  constructor(
    private readonly apiService: ApiService,
    private readonly userService: UserService,
  ) {}

  async initialize() {
    try {
      this.logger.log('🔍 Checking GPIO availability...');

      // CRITICAL: Check GPIO availability FIRST
      this.gpioAvailable = await this.checkGpioAvailability();

      if (!this.gpioAvailable) {
        this.logger.warn('⚠️ GPIO hardware not available - activating simulation mode');
        this.logger.log('💡 Test switches using: GET /test/switch/{1-5}');
        this.logger.log('🔧 All GPIO operations will be simulated');
        return; // Exit early - no hardware initialization
      }

      this.logger.log('🔌 GPIO hardware detected - initializing physical pins...');

      // Only initialize hardware if GPIO is available
      await this.initializeHardware();

      this.logger.log('✅ GPIO hardware initialization completed');
    } catch (error) {
      this.logger.error('❌ GPIO initialization failed:', error);
      this.gpioAvailable = false; // Fallback to simulation
      this.logger.warn('🔄 Falling back to simulation mode due to hardware error');
      this.cleanup();
    }
  }

  private async initializeHardware() {
    await this.ensurePinsUnexported();

    // Initialize switch pins (input with pull-up)
    for (let i = 0; i < SWITCH_PINS.length; i++) {
      const pin = SWITCH_PINS[i];
      try {
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 100));

        const gpio = new Gpio(pin, 'in', 'rising', { activeLow: true });
        this.switches.push(gpio);
        this.logger.log(`✅ Switch ${i + 1} initialized on GPIO ${pin}`);
      } catch (error) {
        this.logger.error(`❌ Failed to initialize switch ${i + 1} on GPIO ${pin}:`, error);
        throw error;
      }
    }

    // Initialize bulb pins (output)
    for (let i = 0; i < BULB_PINS.length; i++) {
      const pin = BULB_PINS[i];
      try {
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 100));

        const gpio = new Gpio(pin, 'out');
        await gpio.write(0); // Initially off
        this.bulbs.push(gpio);
        this.logger.log(`✅ Bulb ${i + 1} initialized on GPIO ${pin}`);
      } catch (error) {
        this.logger.error(`❌ Failed to initialize bulb ${i + 1} on GPIO ${pin}:`, error);
        throw error;
      }
    }
  }

  private async ensurePinsUnexported() {
    const allPins = [...SWITCH_PINS, ...BULB_PINS];

    for (const pin of allPins) {
      const pinPath = `/sys/class/gpio/gpio${pin}`;

      if (fs.existsSync(pinPath)) {
        try {
          // Unexport the pin if it's already exported
          fs.writeFileSync('/sys/class/gpio/unexport', pin.toString());
          this.logger.log(`🔄 Unexported existing GPIO ${pin}`);

          // Wait for the system to process the unexport
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          this.logger.warn(`⚠️ Could not unexport GPIO ${pin}: ${error.message}`);
        }
      }
    }
  }

  private async checkGpioAvailability(): Promise<boolean> {
    try {
      // In Docker, we might need to check differently
      const isDocker = this.isRunningInDocker();

      if (isDocker) {
        this.logger.log('🐋 Running in Docker container');
      }

      // Check basic GPIO requirements
      const hasGpioExport = fs.existsSync('/sys/class/gpio/export');
      const hasGpioMem = fs.existsSync('/dev/gpiomem');
      const hasDeviceTree = fs.existsSync('/proc/device-tree/model');

      this.logger.log(`🔍 GPIO Check - Export: ${hasGpioExport}, Memory: ${hasGpioMem}, DeviceTree: ${hasDeviceTree}`);

      if (!hasGpioExport || !hasGpioMem) {
        return false;
      }

      // Check if it's actually a Raspberry Pi (may not have device tree in container)
      if (hasDeviceTree) {
        try {
          const model = fs.readFileSync('/proc/device-tree/model', 'utf8');
          const isRaspberryPi = model.includes('Raspberry Pi');
          this.logger.log(`📱 Device: ${model.trim()}`);
          this.logger.log(`🍓 Is Raspberry Pi: ${isRaspberryPi}`);

          if (!isRaspberryPi && !isDocker) {
            return false;
          }
        } catch (error) {
          this.logger.warn(`⚠️ Could not read device model: ${error.message}`);
          // In Docker, this might fail but GPIO could still work
        }
      }

      // Test write access to GPIO export
      try {
        fs.accessSync('/sys/class/gpio/export', fs.constants.W_OK);
        this.logger.log('✅ GPIO export is writable');

        // Additional check: try to export/unexport a test pin
        const testPin = 26; // Use a pin not in our regular pins
        try {
          // Try to unexport first in case it's already exported
          if (fs.existsSync(`/sys/class/gpio/gpio${testPin}`)) {
            fs.writeFileSync('/sys/class/gpio/unexport', testPin.toString());
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Try to export
          fs.writeFileSync('/sys/class/gpio/export', testPin.toString());
          await new Promise(resolve => setTimeout(resolve, 100));

          // Check if it was created
          const testPinExists = fs.existsSync(`/sys/class/gpio/gpio${testPin}`);

          // Clean up
          if (testPinExists) {
            fs.writeFileSync('/sys/class/gpio/unexport', testPin.toString());
          }

          this.logger.log('✅ GPIO test export/unexport successful');
          return testPinExists;
        } catch (testError) {
          this.logger.warn(`⚠️ GPIO test export failed: ${testError.message}`);
          return false;
        }
      } catch (writeError) {
        this.logger.warn(`⚠️ GPIO export not writable: ${writeError.message}`);
        return false;
      }

    } catch (error) {
      this.logger.warn(`⚠️ GPIO availability check failed: ${error.message}`);
      return false;
    }
  }

  private isRunningInDocker(): boolean {
    try {
      // Check for .dockerenv file
      if (fs.existsSync('/.dockerenv')) {
        return true;
      }

      // Check cgroup
      const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
      return cgroup.includes('docker') || cgroup.includes('containerd');
    } catch {
      return false;
    }
  }

  startMonitoring() {
    if (this.isMonitoring) {
      this.logger.warn('⚠️ GPIO monitoring already active');
      return;
    }

    this.logger.log('🚀 Starting GPIO monitoring...');
    this.isMonitoring = true;

    if (!this.gpioAvailable) {
      this.logger.log('📝 SIMULATION MODE: GPIO monitoring active');
      this.logger.log('🧪 Test endpoints: GET /test/switch/{1-5}');
      return;
    }

    // Set up interrupt-based monitoring for each switch
    this.switches.forEach((gpio, index) => {
      gpio.watch((err, value) => {
        if (err) {
          this.logger.error(`❌ Error monitoring switch ${index + 1}:`, err);
          return;
        }

        if (value === 1) {
          this.handleSwitchPress(index + 1); // Fix: index should be 1-based
        }
      });
    });

    this.logger.log('✅ HARDWARE MODE: Physical GPIO monitoring active');
  }

  async handleSwitchPress(switchIndex: number) {
    if (switchIndex <= 0 || switchIndex > SWITCH_PINS.length) {
      throw new BadRequestException(`Invalid switch position: ${switchIndex}`);
    }

    this.logger.log(`🔘 Switch ${switchIndex} activated`);

    try {
      const promises = [
        this.turnOnBulb(switchIndex - 1), // Convert to 0-based for array access
        this.sendApiRequest(SWITCH_PINS[switchIndex - 1])
      ];

      const [turnOnBulb, sendApiRequest] = await Promise.all(promises);
      return { turnOnBulb, sendApiRequest };
    } catch (error) {
      if (error.status === HttpStatus.UNAUTHORIZED) {
        throw new UnauthorizedException(error.response?.data);
      }
      throw error;
    }
  }

  private async turnOnBulb(bulbIndex: number) {
    try {
      if (!this.gpioAvailable) {
        // Simulation mode
        this.logger.log(`🔧 SIMULATION: Bulb ${bulbIndex + 1} → ON`);
        await new Promise(resolve => setTimeout(resolve, 100));
        this.logger.log(`💡 SIMULATION: Bulb ${bulbIndex + 1} illuminated (2s)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.logger.log(`🔧 SIMULATION: Bulb ${bulbIndex + 1} → OFF`);
        return { simulated: true, bulb: bulbIndex + 1 };
      }

      // Hardware mode
      const bulb = this.bulbs[bulbIndex];
      if (!bulb) {
        this.logger.error(`❌ Bulb ${bulbIndex + 1} not initialized`);
        return { error: 'Bulb not initialized' };
      }

      await bulb.write(1);
      this.logger.log(`💡 HARDWARE: Bulb ${bulbIndex + 1} → ON (GPIO ${BULB_PINS[bulbIndex]})`);

      await new Promise(resolve => setTimeout(resolve, 2000));

      await bulb.write(0);
      this.logger.log(`💡 HARDWARE: Bulb ${bulbIndex + 1} → OFF (GPIO ${BULB_PINS[bulbIndex]})`);

      return { hardware: true, bulb: bulbIndex + 1, gpio: BULB_PINS[bulbIndex] };
    } catch (error) {
      this.logger.error(`❌ Error controlling bulb ${bulbIndex + 1}:`, error);
      return { error: error.message };
    }
  }

  private async sendApiRequest(switchIndex: number) {
    try {
      const user = await this.userService.getUser(switchIndex);

      if (!user) {
        this.logger.error(`❌ No user found for switch pin ${switchIndex}`);
        return { error: 'No user found' };
      }

      const payload = {
        status: 'calling',
        branchId: process.env.DEVICE_ID || '',
        isMultiService: false,
        location: user.location,
      };

      this.logger.log(`📡 API: Sending request for switch pin ${switchIndex} (user: ${user.userId})`);
      const { data } = await this.apiService.sendSwitchEvent(payload, user.accessToken);

      this.logger.log(`✅ API: Request completed for switch pin ${switchIndex}`);

      return data?.data;
    } catch (error) {
      this.logger.error(`❌ API: Failed for switch pin ${switchIndex}:`, error.message);
      throw error;
    }
  }

  getStatus() {
    return {
      gpioAvailable: this.gpioAvailable,
      mode: this.gpioAvailable ? 'hardware' : 'simulation',
      isMonitoring: this.isMonitoring,
      isDocker: this.isRunningInDocker(),
      switchStates: this.switchStates,
      switchPins: SWITCH_PINS,
      bulbPins: BULB_PINS,
      switchCount: this.switches.length,
      bulbCount: this.bulbs.length,
      timestamp: new Date().toISOString(),
      systemInfo: {
        hasGpioExport: fs.existsSync('/sys/class/gpio/export'),
        hasGpioMem: fs.existsSync('/dev/gpiomem'),
        hasDeviceTree: fs.existsSync('/proc/device-tree/model'),
      }
    };
  }

  onModuleDestroy() {
    this.cleanup();
  }

  private cleanup() {
    this.logger.log('🧹 Cleaning up GPIO resources...');
    this.isMonitoring = false;

    this.monitoringIntervals.forEach(interval => clearInterval(interval));
    this.monitoringIntervals = [];

    if (!this.gpioAvailable) {
      this.logger.log('✅ Cleanup completed (simulation mode)');
      return;
    }

    // Hardware cleanup
    this.switches.forEach((gpio, index) => {
      try {
        gpio.unwatchAll();
        gpio.unexport();
        this.logger.log(`✅ Switch ${index + 1} cleaned up`);
      } catch (error) {
        this.logger.error(`⚠️ Error cleaning switch ${index + 1}:`, error);
      }
    });

    this.bulbs.forEach((gpio, index) => {
      try {
        gpio.writeSync(0);
        gpio.unexport();
        this.logger.log(`✅ Bulb ${index + 1} cleaned up`);
      } catch (error) {
        this.logger.error(`⚠️ Error cleaning bulb ${index + 1}:`, error);
      }
    });

    this.switches = [];
    this.bulbs = [];
    this.logger.log('✅ Hardware cleanup completed');
  }
}