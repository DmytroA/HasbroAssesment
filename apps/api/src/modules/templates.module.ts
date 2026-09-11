import { Module } from '@nestjs/common';
import { GAME_TEMPLATES } from '../helpers/templates';
import { TEMPLATE_DEFINITIONS, TemplatesService } from '../providers/templates.service';

@Module({
  providers: [{ provide: TEMPLATE_DEFINITIONS, useValue: GAME_TEMPLATES }, TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}