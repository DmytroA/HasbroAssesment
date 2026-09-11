import { DateTime } from 'luxon';
import { readConfig } from './config';
import { SqliteEventsRepository } from './database/sqlite-events.repository';
import { TemplatesService } from './templates/templates.module';
import { GAME_TEMPLATES } from './templates/templates';
import { EventsService } from './events/events.service';

const config = readConfig();
const repository = new SqliteEventsRepository(config);
try {
  if (repository.list().length) console.log('Seed skipped: events already exist.');
  else {
    const service = new EventsService(repository, new TemplatesService(GAME_TEMPLATES), config);
    GAME_TEMPLATES.forEach((template, index) => {
      service.create({
        name: ['Friday Night Magic', 'Pokémon League', 'Sunday Yu-Gi-Oh!'][index],
        templateId: template.id,
        format: template.formats[0],
        capacity: template.defaultCapacity,
        startsAtLocal: DateTime.now()
          .setZone(config.store.timeZone)
          .plus({ weeks: 1 })
          .set({ weekday: (5 + index) as 5 | 6 | 7, hour: 18, minute: 0 })
          .toFormat("yyyy-MM-dd'T'HH:mm"),
      });
    });
    console.log('Created three sample events.');
  }
} finally {
  repository.onModuleDestroy();
}
