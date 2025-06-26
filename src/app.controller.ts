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

  @Get('test/switch/:index')
  async testSwitch(@Param('index', ParseIntPipe) index: number) {
    return  this.gpioService.handleSwitchPress(index);
  }
}
