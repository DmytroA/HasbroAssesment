import { DynamicModule, Global, Module } from '@nestjs/common';
import { RUNTIME_CONFIG, RuntimeConfig } from '../config';

@Global()
@Module({})
export class ConfigModule {
  static forRoot(config: RuntimeConfig): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: RUNTIME_CONFIG, useValue: config }],
      exports: [RUNTIME_CONFIG],
    };
  }
}
