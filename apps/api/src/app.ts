import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { RuntimeConfig, projectRoot } from './config';
import { AppModule } from './modules/app.module';

export async function createApp(config: RuntimeConfig, logger: false | undefined = undefined) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config), {
    logger,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  const webDist = resolve(projectRoot, 'apps/web/dist');
  // Production serves both layers from one origin. API routes never fall through to the SPA.
  if (existsSync(resolve(webDist, 'index.html'))) {
    app.useStaticAssets(webDist, { index: false });
    const express = app.getHttpAdapter().getInstance();
    express.get(
      ['/', '/events', '/events/new', '/events/:id', '/events/:id/register'],
      (_request: unknown, response: { sendFile: (path: string) => void }) =>
        response.sendFile(resolve(webDist, 'index.html')),
    );
  }
  app.enableShutdownHooks();
  return app;
}
