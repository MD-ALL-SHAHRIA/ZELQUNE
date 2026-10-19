import { type Provider } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { type OpenAPIObject } from '@nestjs/swagger';
import { cleanupOpenApiDoc, ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';

export { createZodDto, ZodResponse, ZodValidationException } from 'nestjs-zod';

/**
 * Global zod validation for request DTOs (`createZodDto`) and response serialisation
 * (`@ZodResponse`), so OpenAPI, runtime validation and TypeScript share one schema.
 */
export const ZOD_PROVIDERS: Provider[] = [
  { provide: APP_PIPE, useClass: ZodValidationPipe },
  { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
];

/**
 * Required post-processing so zod-derived schemas render correctly in OpenAPI.
 *
 * `@ZodResponse` without a status documents the body under `default`, which generated clients
 * (openapi-fetch) type as an error. Nest answers every non-POST route with 200 unless
 * `@HttpCode` says otherwise (and then ZodResponse carries that status), so document it as 200.
 */
export function finalizeOpenApiDocument(document: OpenAPIObject): OpenAPIObject {
  const cleaned = cleanupOpenApiDoc(document);
  for (const item of Object.values(cleaned.paths)) {
    for (const method of ['get', 'put', 'patch', 'delete'] as const) {
      const responses = item[method]?.responses;
      if (responses && Object.keys(responses).length === 1 && responses.default) {
        responses['200'] = responses.default;
        delete responses.default;
      }
    }
  }
  return cleaned;
}
