import { DynamicModule, Module } from '@nestjs/common';
import { RuntimeConfig } from '../config';
import { ConfigController } from '../controllers/config.controller';
import { ConfigModule } from './config.module';
import { EventsModule } from './events.module';
import { TemplatesModule } from './templates.module';

@Module({})
export class AppModule {
  static forRoot(config: RuntimeConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigModule.forRoot(config), TemplatesModule, EventsModule],
      controllers: [ConfigController],
    };
  }
}
