import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import type { EventDetail } from '@tabletop/contracts';
import { RUNTIME_CONFIG, RuntimeConfig } from '../config';
import { CreateEventDto } from '../helpers/event.dto';
import { EventsRepository } from '../repositories/events.repository';
import { TemplatesService } from './templates.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly repository: EventsRepository,
    private readonly templates: TemplatesService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}

  list() {
    return this.repository.list();
  }

  get(id: string): EventDetail {
    const event = this.repository.find(id);
    if (!event) throw new NotFoundException('Event not found.');
    return { ...event, registrationUrl: `${this.config.publicUrl}/events/${event.id}/register` };
  }

  create(input: CreateEventDto): EventDetail {
    const template = this.templates.get(input.templateId);
    if (!template.formats.includes(input.format))
      throw new BadRequestException('Choose a format supported by this game.');
    const start = DateTime.fromISO(input.startsAtLocal, { zone: this.config.store.timeZone });
    if (!start.isValid || start.toFormat("yyyy-MM-dd'T'HH:mm") !== input.startsAtLocal) {
      throw new BadRequestException('This local date/time does not exist. Choose another time.');
    }
    if (start.getPossibleOffsets().length > 1)
      throw new BadRequestException(
        'This time occurs twice during the daylight-saving change. Choose an unambiguous time.',
      );
    if (start.toMillis() <= Date.now())
      throw new BadRequestException('Choose a start time in the future.');
    const event = this.repository.create({
      id: randomUUID(),
      name: input.name,
      templateId: template.id,
      gameName: template.name,
      format: input.format,
      startsAt: start.toUTC().toISO()!,
      endsAt: start.plus({ minutes: template.defaultDurationMinutes }).toUTC().toISO()!,
      capacity: input.capacity,
      location: this.config.store.location,
      timeZone: this.config.store.timeZone,
    });
    return this.get(event.id);
  }

  register(eventId: string, name: string) {
    const displayName = name.normalize('NFKC').trim().replace(/\s+/gu, ' ');
    if (!displayName || displayName.length > 80)
      throw new BadRequestException('Enter a name between 1 and 80 characters.');
    const result = this.repository.register(eventId, displayName, displayName.toLowerCase());
    switch (result.status) {
      case 'registered':
        return result.receipt;
      case 'missing':
        throw new NotFoundException('Event not found.');
      case 'duplicate':
        throw new ConflictException(
          'This name is already registered for this event. If you share a name, add an initial.',
        );
      case 'full':
        throw new ConflictException('This event is full. No seats remain.');
      case 'busy':
        throw new ServiceUnavailableException(
          'Registration is busy. Please try again in a moment.',
        );
    }
  }
}