import { Injectable } from '@nestjs/common';
import { createEvent } from 'ics';
import QRCode from 'qrcode';
import type { EventDetail } from '@tabletop/contracts';

@Injectable()
export class EventAssetsService {
  calendar(event: EventDetail): string {
    const { error, value } = createEvent({
      uid: `${event.id}@tabletop.local`, title: event.name,
      description: `${event.gameName} · ${event.format}\nRegister: ${event.registrationUrl}`,
      location: event.location, url: event.registrationUrl,
      start: Date.parse(event.startsAt), end: Date.parse(event.endsAt),
      startInputType: 'utc', startOutputType: 'utc', endInputType: 'utc', endOutputType: 'utc',
      status: 'CONFIRMED', productId: 'tabletop/events',
    });
    if (error || !value) throw error ?? new Error('Calendar generation failed');
    return value;
  }
  qr(event: EventDetail) { return QRCode.toBuffer(event.registrationUrl, { type: 'png', width: 320, margin: 4, errorCorrectionLevel: 'M' }); }
}
