import { Module } from '@nestjs/common';
import { EventsController } from '../controllers/events.controller';
import { EventAssetsService } from '../providers/event-assets.service';
import { EventsService } from '../providers/events.service';
import { EventsRepository } from '../repositories/events.repository';
import { SqliteEventsRepository } from '../repositories/sqlite-events.repository';
import { TemplatesModule } from './templates.module';

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