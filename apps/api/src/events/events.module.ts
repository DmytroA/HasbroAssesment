import { Module } from '@nestjs/common';
import { TemplatesModule } from '../templates/templates.module';
import { SqliteEventsRepository } from '../database/sqlite-events.repository';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';
import { EventAssetsService } from './event-assets.service';
import { EventsController } from './events.controller';

@Module({
  imports: [TemplatesModule],
  controllers: [EventsController],
  providers: [
    { provide: EventsRepository, useClass: SqliteEventsRepository },
    EventsService,
    EventAssetsService,
  ],
})
export class EventsModule {}
