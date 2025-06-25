// src/gpio/gpio.service.ts

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Gpio } from 'onoff';
import { ApiService } from '../api/api.service';
import { UserService } from '../user/user.service';
import * as process from 'node:process';

@Injectable()
export class GPIOService implements OnModuleDestroy {
  private readonly logger = new Logger(GPIOService.name);

  // GPIO pin configurations
  private readonly SWITCH_PINS = [2, 3, 4, 17, 27];
  private readonly BULB_PINS = [18, 23, 24, 25, 8];

  // GPIO instances
  private switches: Gpio[] = [];
  private bulbs: Gpio[] = [];

  // State tracking
  private switchStates: boolean[] = new Array(5).fill(false);
  private isMonitoring = false;
  private monitoringIntervals: ReturnType<typeof setTimeout>[] = [];

  constructor(
    private readonly apiService: ApiService,
    private readonly userService: UserService,
  ) {}

  async initialize() {
    try {
      this.logger.log('Initializing GPIO...');

      // Initialize switch pins (input with pull-up)
      for (let i = 0; i < this.SWITCH_PINS.length; i++) {
        const pin = this.SWITCH_PINS[i];
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
      for (let i = 0; i < this.BULB_PINS.length; i++) {
        const pin = this.BULB_PINS[i];
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

      this.logger.log('✅ GPIO initialization completed');

    } catch (error) {
      this.logger.error('❌ GPIO initialization failed:', error);
      this.cleanup();
      throw error;
    }
  }

  startMonitoring() {
    if (this.isMonitoring) {
      this.logger.warn('GPIO monitoring already started');
      return;
    }

    this.logger.log('Starting GPIO monitoring...');
    this.isMonitoring = true;

    // Set up interrupt-based monitoring for each switch
    this.switches.forEach((gpio, index) => {
      gpio.watch((err, value) => {
        if (err) {
          this.logger.error(`Error monitoring switch ${index + 1}:`, err);
          return;
        }

        if (value === 1) { // Rising edge detected
          this.handleSwitchPress(index);
        }
      });
    });

    this.logger.log('✅ GPIO monitoring started');
  }

  async handleSwitchPress(switchIndex: number) {
    if (switchIndex < 0 || switchIndex >= this.SWITCH_PINS.length) {
      this.logger.error(`Invalid switch index: ${switchIndex}`);
      return;
    }

    this.logger.log(`🔘 Switch ${switchIndex + 1} pressed`);

    try {
      // Execute both actions in parallel
      const promises = [
        this.turnOnBulb(switchIndex),
        this.sendApiRequest(switchIndex),
      ];

      await Promise.allSettled(promises);

    } catch (error) {
      this.logger.error(`Error handling switch ${switchIndex + 1} press:`, error);
    }
  }

  private async turnOnBulb(bulbIndex: number) {
    try {
      const bulb = this.bulbs[bulbIndex];
      if (!bulb) {
        this.logger.error(`Bulb ${bulbIndex + 1} not initialized`);
        return;
      }

      // Turn on bulb
      await bulb.write(1);
      this.logger.log(`💡 Bulb ${bulbIndex + 1} turned ON`);

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Turn off bulb
      await bulb.write(0);
      this.logger.log(`💡 Bulb ${bulbIndex + 1} turned OFF`);

    } catch (error) {
      this.logger.error(`Error controlling bulb ${bulbIndex + 1}:`, error);
    }
  }

  private async sendApiRequest(switchIndex: number) {
    try {
      const user = await this.userService.getUser(switchIndex);

      if (!user) {
        this.logger.error('No users available for API request');
        return;
      }

      const location = JSON.parse(user.location);

      const payload = {
        branchId: process.env.DEVICE_ID || 'default-branch',
        isMultiService: false,
        location: location,
        status: 'calling',
      };

      await this.apiService.sendSwitchEvent(payload, user.accessToken);
      this.logger.log(`📡 API request sent successfully for switch ${switchIndex + 1}`);

    } catch (error) {
      this.logger.error(`Error sending API request for switch ${switchIndex + 1}:`, error);
    }
  }

  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      switchStates: this.switchStates,
      switchPins: this.SWITCH_PINS,
      bulbPins: this.BULB_PINS,
      switchCount: this.switches.length,
      bulbCount: this.bulbs.length,
      timestamp: new Date().toISOString(),
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
    this.logger.log('✅ GPIO cleanup completed');
  }
}
