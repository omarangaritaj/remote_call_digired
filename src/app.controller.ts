// src/app.controller.ts

import { Controller, Get, Post, Param, ParseIntPipe } from '@nestjs/common';
import { AppService } from './app.service';
import { GPIOService } from './gpio/gpio.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly gpioService: GPIOService,
  ) {}

  @Get()
  getRoot() {
    return this.appService.getApplicationInfo();
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('status')
  getStatus() {
    return this.gpioService.getStatus();
  }

  @Post('test/switch/:index')
  async testSwitch(@Param('index', ParseIntPipe) index: number) {
    await this.gpioService.handleSwitchPress(index);
    return {
      message: `Switch ${index + 1} test completed successfully`,
      timestamp: new Date().toISOString(),
    };
  }
}
