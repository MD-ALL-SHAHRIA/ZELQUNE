import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { type ConfirmChannel } from 'amqplib';
import { type AmqpConnectionManager, type ChannelWrapper, connect } from 'amqp-connection-manager';
import { assertTopology } from './topology';

export interface MessagingOptions {
  url: string;
  serviceName: string;
}

export const MESSAGING_OPTIONS = Symbol('MESSAGING_OPTIONS');

/** One auto-reconnecting connection + confirm channel per service. */
@Injectable()
export class RabbitMqConnection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqConnection.name);
  private connection?: AmqpConnectionManager;
  private wrapper?: ChannelWrapper;

  constructor(@Inject(MESSAGING_OPTIONS) private readonly options: MessagingOptions) {}

  onModuleInit(): void {
    const connection = connect([this.options.url], {
      heartbeatIntervalInSeconds: 15,
      reconnectTimeInSeconds: 2,
    });
    connection.on('connect', () => this.logger.log('Connected to RabbitMQ'));
    connection.on('disconnect', ({ err }) =>
      this.logger.warn(`Disconnected from RabbitMQ: ${err?.message ?? 'unknown reason'}`),
    );
    this.connection = connection;
    this.wrapper = connection.createChannel({
      json: false,
      confirm: true,
      setup: (channel: ConfirmChannel) => assertTopology(channel, this.options.serviceName),
    });
  }

  get channel(): ChannelWrapper {
    if (!this.wrapper) throw new Error('RabbitMQ channel used before module init');
    return this.wrapper;
  }

  isConnected(): boolean {
    return this.connection?.isConnected() ?? false;
  }

  async onModuleDestroy(): Promise<void> {
    await this.wrapper?.close();
    await this.connection?.close();
  }
}
