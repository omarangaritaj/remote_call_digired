import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { GPIOService } from './gpio/gpio.service';
import { UserService } from './user/user.service';
import { ApiService } from './api/api.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    GPIOService,
    UserService,
    ApiService,
  ],
})
export class AppModule {}