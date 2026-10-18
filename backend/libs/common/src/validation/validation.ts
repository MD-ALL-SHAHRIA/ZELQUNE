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

/** Required post-processing so zod-derived schemas render correctly in OpenAPI. */
export function finalizeOpenApiDocument(document: OpenAPIObject): OpenAPIObject {
  return cleanupOpenApiDoc(document);
}
