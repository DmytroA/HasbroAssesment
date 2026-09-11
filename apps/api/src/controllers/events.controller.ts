import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CreateEventDto, RegisterDto } from '../helpers/event.dto';
import { EventAssetsService } from '../providers/event-assets.service';
import { EventsService } from '../providers/events.service';

@Controller('events')
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly assets: EventAssetsService,
  ) {}

  @Get()
  list() {
    return this.events.list();
  }

  @Post()
  create(@Body() input: CreateEventDto) {
    return this.events.create(input);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.events.get(id);
  }

  @Post(':id/registrations')
  register(@Param('id', ParseUUIDPipe) id: string, @Body() input: RegisterDto) {
    return this.events.register(id, input.name);
  }

  @Get(':id/calendar.ics')
  calendar(@Param('id', ParseUUIDPipe) id: string, @Res() response: Response) {
    response
      .set({
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="event-${id}.ics"`,
      })
      .send(this.assets.calendar(this.events.get(id)));
  }

  @Get(':id/qr.png')
  async qr(@Param('id', ParseUUIDPipe) id: string, @Res() response: Response) {
    response.type('png').send(await this.assets.qr(this.events.get(id)));
  }
}
