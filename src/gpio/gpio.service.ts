// src/gpio/gpio.service.ts

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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
      this.logger.log('Initializing GPIO...');

      // Check if GPIO is available
      this.gpioAvailable = this.checkGpioAvailability();

      if (!this.gpioAvailable) {
        this.logger.warn('⚠️ GPIO not available - running in simulation mode');
        this.logger.log('💡 Use POST /test/switch/{index} endpoints to test functionality');
        this.logger.log('📍 GPIO simulation active - all switch presses will be simulated');
        return;
      }

      this.logger.log('🔌 GPIO hardware detected - initializing physical pins...');

      // Initialize switch pins (input with pull-up)
      for (let i = 0; i < SWITCH_PINS.length; i++) {
        const pin = SWITCH_PINS[i];
        try {
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
          const gpio = new Gpio(pin, 'out');
          await gpio.write(0); // Initially off
          this.bulbs.push(gpio);
          this.logger.log(`✅ Bulb ${i + 1} initialized on GPIO ${pin}`);
        } catch (error) {
          this.logger.error(`❌ Failed to initialize bulb ${i + 1} on GPIO ${pin}:`, error);
          throw error;
        }
      }

      this.logger.log('✅ GPIO hardware initialization completed');
    } catch (error) {
      this.logger.error('❌ GPIO initialization failed:', error);
      this.cleanup();
      throw error;
    }
  }

  private checkGpioAvailability(): boolean {
    try {
      // Check if we're on a Raspberry Pi with GPIO access
      const hasGpioExport = fs.existsSync('/sys/class/gpio/export');
      const hasGpioMem = fs.existsSync('/dev/gpiomem');
      const hasDeviceTree = fs.existsSync('/proc/device-tree/model');

      this.logger.log(`GPIO Check - Export: ${hasGpioExport}, Mem: ${hasGpioMem}, DeviceTree: ${hasDeviceTree}`);

      // Also check if we can read the device tree model
      if (hasDeviceTree) {
        try {
          const model = fs.readFileSync('/proc/device-tree/model', 'utf8');
          const isRaspberryPi = model.includes('Raspberry Pi');
          this.logger.log(`Device Model: ${model.trim()}, Is Raspberry Pi: ${isRaspberryPi}`);

          // Additional check: try to access GPIO export (write test)
          if (hasGpioExport && hasGpioMem && isRaspberryPi) {
            try {
              // Test if we can write to GPIO export
              fs.accessSync('/sys/class/gpio/export', fs.constants.W_OK);
              this.logger.log('✅ GPIO export is writable');
              return true;
            } catch (writeError) {
              this.logger.warn(`⚠️ GPIO export exists but not writable: ${writeError.message}`);
              return false;
            }
          }

          return false;
        } catch (error) {
          this.logger.warn(`Could not read device model: ${error.message}`);
          return false;
        }
      }

      return false;
    } catch (error) {
      this.logger.warn(`GPIO availability check failed: ${error.message}`);
      return false;
    }
  }

  startMonitoring() {
    if (this.isMonitoring) {
      this.logger.warn('GPIO monitoring already started');
      return;
    }

    this.logger.log('Starting GPIO monitoring...');
    this.isMonitoring = true;

    if (!this.gpioAvailable) {
      this.logger.log('📝 GPIO simulation mode active');
      this.logger.log('🧪 Test switches using: POST /test/switch/{0-4}');
      return;
    }

    // Set up interrupt-based monitoring for each switch
    this.switches.forEach((gpio, index) => {
      gpio.watch((err, value) => {
        if (err) {
          this.logger.error(`Error monitoring switch ${index + 1}:`, err);
          return;
        }

        if (value === 1) {
          // Rising edge detected
          this.handleSwitchPress(index);
        }
      });
    });

    this.logger.log('✅ GPIO hardware monitoring started');
  }

  async handleSwitchPress(switchIndex: number) {
    if (switchIndex < 0 || switchIndex >= SWITCH_PINS.length) {
      this.logger.error(`Invalid switch index: ${switchIndex}`);
      return;
    }

    this.logger.log(`🔘 Switch ${switchIndex + 1} pressed`);

    try {
      // Execute both actions in parallel
      const promises = [this.turnOnBulb(switchIndex), this.sendApiRequest(switchIndex)];

      await Promise.all(promises);
    } catch (error) {
      this.logger.error(`Error handling switch ${switchIndex + 1} press:`, error);
    }
  }

  private async turnOnBulb(bulbIndex: number) {
    try {
      if (!this.gpioAvailable) {
        this.logger.log(`🔧 SIMULATION: Bulb ${bulbIndex + 1} turning ON...`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for realism
        this.logger.log(`💡 SIMULATION: Bulb ${bulbIndex + 1} ON for 2 seconds`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.logger.log(`🔧 SIMULATION: Bulb ${bulbIndex + 1} turned OFF`);
        return;
      }

      const bulb = this.bulbs[bulbIndex];
      if (!bulb) {
        this.logger.error(`Bulb ${bulbIndex + 1} not initialized`);
        return;
      }

      // Turn on bulb
      await bulb.write(1);
      this.logger.log(`💡 Bulb ${bulbIndex + 1} turned ON (GPIO ${BULB_PINS[bulbIndex]})`);

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Turn off bulb
      await bulb.write(0);
      this.logger.log(`💡 Bulb ${bulbIndex + 1} turned OFF (GPIO ${BULB_PINS[bulbIndex]})`);
    } catch (error) {
      this.logger.error(`Error controlling bulb ${bulbIndex + 1}:`, error);
    }
  }

  private async sendApiRequest(switchIndex: number) {
    try {
      // Get user by switch index from database
      const user = await this.userService.getUser(switchIndex);

      if (!user) {
        this.logger.error(`No user found for switch ${switchIndex + 1}`);
        return;
      }

      const payload = {
        status: 'calling',
        branchId: process.env.DEVICE_ID || '',
        isMultiService: false,
        location: user.location,
      };

      this.logger.log(`📡 Sending API request for switch ${switchIndex + 1} (user: ${user.userId})`);

      await this.apiService.sendSwitchEvent(payload, user.accessToken);
      this.logger.log(`✅ API request sent successfully for switch ${switchIndex + 1}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send API request for switch ${switchIndex + 1}:`, error);
    }
  }

  getStatus() {
    return {
      gpioAvailable: this.gpioAvailable,
      mode: this.gpioAvailable ? 'hardware' : 'simulation',
      isMonitoring: this.isMonitoring,
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
    this.logger.log('Cleaning up GPIO resources...');
    this.isMonitoring = false;

    // Clear intervals
    this.monitoringIntervals.forEach(interval => clearInterval(interval));
    this.monitoringIntervals = [];

    if (!this.gpioAvailable) {
      this.logger.log('✅ GPIO cleanup completed (simulation mode)');
      return;
    }

    // Cleanup switches
    this.switches.forEach((gpio, index) => {
      try {
        gpio.unexport();
        this.logger.log(`✅ Switch ${index + 1} cleaned up`);
      } catch (error) {
        this.logger.error(`Error cleaning up switch ${index + 1}:`, error);
      }
    });

    // Cleanup bulbs
    this.bulbs.forEach((gpio, index) => {
      try {
        gpio.writeSync(0); // Turn off before cleanup
        gpio.unexport();
        this.logger.log(`✅ Bulb ${index + 1} cleaned up`);
      } catch (error) {
        this.logger.error(`Error cleaning up bulb ${index + 1}:`, error);
      }
    });

    this.switches = [];
    this.bulbs = [];
    this.logger.log('✅ GPIO hardware cleanup completed');
  }
}
