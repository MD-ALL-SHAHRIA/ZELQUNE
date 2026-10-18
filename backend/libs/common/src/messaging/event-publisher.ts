import { Injectable } from '@nestjs/common';
import { type EventEnvelope } from '@zelqune/contracts';
import { REQUEST_ID_HEADER } from '../http/request-id';
import { RabbitMqConnection } from './rabbitmq.connection';
import { EVENTS_EXCHANGE } from './topology';

const PUBLISH_TIMEOUT_MS = 5000;

/**
 * Low-level publish with broker confirms. Application code should NOT call this directly:
 * write events with OutboxService inside the business transaction; OutboxRelay publishes them.
 */
@Injectable()
export class EventPublisher {
  constructor(private readonly connection: RabbitMqConnection) {}

  async publish(event: EventEnvelope): Promise<void> {
    if (!this.connection.isConnected()) {
      throw new Error('RabbitMQ is not connected');
    }
    await this.connection.channel.publish(
      EVENTS_EXCHANGE,
      event.type,
      Buffer.from(JSON.stringify(event)),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: event.id,
        type: event.type,
        timestamp: Math.floor(Date.parse(event.occurredAt) / 1000),
        headers: { [REQUEST_ID_HEADER]: event.requestId, 'x-event-version': event.version },
        timeout: PUBLISH_TIMEOUT_MS,
      },
    );
  }
}
