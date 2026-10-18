import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { APP_CONFIG, loadLocalEnv } from '@zelqune/common';
import { AppModule } from './app.module';
import { type GatewayEnv } from './config/gateway-env';
import { setupGateway } from './setup';

async function bootstrap(): Promise<void> {
  loadLocalEnv('gateway');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get<GatewayEnv>(APP_CONFIG);
  setupGateway(app, config);
  await app.listen(config.HTTP_PORT, '0.0.0.0');
  new Logger('Bootstrap').log(`gateway up: http :${config.HTTP_PORT} (/v1, /docs, /health)`);
}

void bootstrap();
