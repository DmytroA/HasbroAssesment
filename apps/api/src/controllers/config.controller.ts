import { Controller, Get, Inject } from '@nestjs/common';
import { RUNTIME_CONFIG, RuntimeConfig } from '../config';
import { TemplatesService } from '../providers/templates.service';

@Controller()
export class ConfigController {
  constructor(
    private readonly templates: TemplatesService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}

  @Get('config')
  get() {
    return { templates: this.templates.list(), store: this.config.store };
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}