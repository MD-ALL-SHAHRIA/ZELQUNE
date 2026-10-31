import { type DynamicModule } from '@nestjs/common';
import { type IncomingMessage } from 'node:http';
import { LoggerModule } from 'nestjs-pino';
import { APP_CONFIG } from '../config/config.module';
import { type BaseEnv } from '../config/env';
import { requestContext } from '../context/request-context';
import { REQUEST_ID_HEADER, resolveRequestId } from '../http/request-id';

/** Request URL without its query string: queries can carry personal data (never log them). */
export function withoutQuery(url: string | undefined): string | undefined {
  return url?.split('?')[0];
}

/** pino logger; every line carries `service` and, inside a request/message/event, `requestId`. */
export function createLoggerModule(serviceName: string): DynamicModule {
  return LoggerModule.forRootAsync({
    inject: [APP_CONFIG],
    useFactory: (config: BaseEnv) => ({
      pinoHttp: {
        level: config.LOG_LEVEL,
        base: { service: serviceName },
        genReqId: (req: IncomingMessage) => resolveRequestId(req.headers[REQUEST_ID_HEADER]),
        mixin: () => {
          const requestId = requestContext.requestId();
          return requestId ? { requestId } : {};
        },
        autoLogging: { ignore: (req: IncomingMessage) => req.url === '/health' },
        redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        serializers: {
          // pino-http passes the standard serialised request; keep it, minus the query string.
          req: (req: { url?: string }) => ({ ...req, url: withoutQuery(req.url) }),
        },
      },
    }),
  });
}
