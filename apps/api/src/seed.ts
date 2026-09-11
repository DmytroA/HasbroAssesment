import { DateTime } from 'luxon';
import { readConfig } from './config';
import { GAME_TEMPLATES } from './helpers/templates';
import { EventsService } from './providers/events.service';
import { TemplatesService } from './providers/templates.service';
import { SqliteEventsRepository } from './repositories/sqlite-events.repository';

const config = readConfig();
const repository = new SqliteEventsRepository(config);
try {
  if (repository.list().length) console.log('Seed skipped: events already exist.');
  else {
    const service = new EventsService(repository, new TemplatesService(GAME_TEMPLATES), config);
    GAME_TEMPLATES.forEach((template, index) => {
      service.create({
        name: `${template.name} - ${template.formats[0]}`,
        templateId: template.id,
        format: template.formats[0],
        capacity: template.defaultCapacity,
        startsAtLocal: DateTime.now()
          .setZone(config.store.timeZone)
          .plus({ weeks: 1, days: index })
          .set({ hour: 18, minute: 0 })
          .toFormat("yyyy-MM-dd'T'HH:mm"),
      });
    });
    console.log(`Created ${GAME_TEMPLATES.length} sample events.`);
  }
} finally {
  repository.onModuleDestroy();
}
