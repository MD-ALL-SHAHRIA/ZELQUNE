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
  restoreNullableProperties(document);
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

const EMPTY_TYPE_KEY = 'x-nestjs_zod-empty-type';

/**
 * nestjs-zod hands Swagger a top-level nullable property as `type: ['string', 'null']`; Swagger
 * reads the array as "array of string" and emits `{ type: 'array', items: { type: 'string' } }`.
 * Only those properties carry nestjs-zod's empty-type marker (a real `z.array()` has
 * `type: 'array'`), so turn them back into `type: [<item type>, 'null']` before cleanup.
 */
function restoreNullableProperties(document: OpenAPIObject): void {
  for (const schema of Object.values(document.components?.schemas ?? {})) {
    const properties = (schema as { properties?: Record<string, Record<string, unknown>> })
      .properties;
    for (const property of Object.values(properties ?? {})) {
      const items = property.items as Record<string, unknown> | undefined;
      if (!property[EMPTY_TYPE_KEY] || property.type !== 'array' || !items) continue;
      if (typeof items.type !== 'string') continue;
      delete property.items;
      Object.assign(property, { ...items, type: [items.type, 'null'] });
    }
  }
}
