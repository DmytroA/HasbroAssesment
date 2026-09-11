import 'reflect-metadata';
import { Controller, Get, Global, Inject, Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { RUNTIME_CONFIG, RuntimeConfig, projectRoot } from './config';
import { TemplatesModule, TemplatesService } from './templates/templates.module';
import { EventsModule } from './events/events.module';

@Controller()
class ConfigController {
  constructor(private readonly templates: TemplatesService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}
  @Get('config') get() { return { templates: this.templates.list(), store: this.config.store }; }
  @Get('health') health() { return { status: 'ok' }; }
}

export async function createApp(config: RuntimeConfig, logger: false | undefined = undefined) {
  @Global()
  @Module({ providers: [{ provide: RUNTIME_CONFIG, useValue: config }], exports: [RUNTIME_CONFIG] })
  class ConfigModule {}
  @Module({ imports: [ConfigModule, TemplatesModule, EventsModule], controllers: [ConfigController] })
  class AppModule {}
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const webDist = resolve(projectRoot, 'apps/web/dist');
  // Production serves both layers from one origin. API routes never fall through to the SPA.
  if (existsSync(resolve(webDist, 'index.html'))) {
    app.useStaticAssets(webDist, { index: false });
    const express = app.getHttpAdapter().getInstance();
    express.get(['/', '/events', '/events/new', '/events/:id', '/events/:id/register'], (_request: unknown, response: { sendFile: (path: string) => void }) => response.sendFile(resolve(webDist, 'index.html')));
  }
  app.enableShutdownHooks();
  return app;
}
