import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { UserService } from './user/user.service';
import { GPIOService } from './gpio/gpio.service';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(
      private readonly userService: UserService,
      private readonly gpioService: GPIOService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Initializing GPIO Controller Application...');

    try {
      // Initialize GPIO
      await this.gpioService.initialize();
      this.logger.log('✅ GPIO initialized successfully');

      // Fetch and store users from API
      await this.userService.fetchAndStoreUsers();
      this.logger.log('✅ Users synchronized with API');

      // Start GPIO monitoring
      this.gpioService.startMonitoring();
      this.logger.log('✅ GPIO monitoring started');

      this.logger.log('🎉 Application initialized successfully');

    } catch (error) {
      this.logger.error('❌ Failed to initialize application:', error);
      throw error;
    }
  }

  getApplicationInfo() {
    return {
      message: 'Raspberry Pi GPIO Controller (NestJS)',
      version: '1.0.0',
      device_id: process.env.DEVICE_ID || 'raspberry-pi-001',
      switches: 5,
      bulbs: 5,
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }

  getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}