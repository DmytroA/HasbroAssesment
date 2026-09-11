import { BadRequestException, Inject, Injectable, Module } from '@nestjs/common';
import type { GameTemplate } from '@tabletop/contracts';
import { GAME_TEMPLATES } from './templates';

export const TEMPLATE_DEFINITIONS = Symbol('TEMPLATE_DEFINITIONS');
@Injectable()
export class TemplatesService {
  constructor(@Inject(TEMPLATE_DEFINITIONS) private readonly definitions: readonly GameTemplate[]) {
    const ids = new Set<string>();
    for (const template of definitions) {
      if (ids.has(template.id) || !template.id || !template.name || !template.formats.length ||
          !Number.isInteger(template.defaultDurationMinutes) || template.defaultDurationMinutes < 1 ||
          !Number.isInteger(template.defaultCapacity) || template.defaultCapacity < 1 || template.defaultCapacity > 30) {
        throw new Error(`Invalid game template: ${template.id}`);
      }
      ids.add(template.id);
    }
  }
  list(): GameTemplate[] { return this.definitions.map(template => ({ ...template, formats: [...template.formats] })); }
  get(id: string): GameTemplate {
    const template = this.definitions.find(item => item.id === id);
    if (!template) throw new BadRequestException('Choose a supported game.');
    return template;
  }
}
@Module({ providers: [{ provide: TEMPLATE_DEFINITIONS, useValue: GAME_TEMPLATES }, TemplatesService], exports: [TemplatesService] })
export class TemplatesModule {}
