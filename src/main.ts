// src/main.ts

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import * as process from 'process';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // Enable validation pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 GPIO Controller running on port ${port}`);
    logger.log(`📊 Health check available at: http://localhost:${port}/health`);
    logger.log(`📈 Status endpoint available at: http://localhost:${port}/status`);
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
