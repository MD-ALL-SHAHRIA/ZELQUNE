import { type OpenAPIObject } from '@nestjs/swagger';
import { finalizeOpenApiDocument } from './validation';

describe('finalizeOpenApiDocument', () => {
  const body = { description: '', content: { 'application/json': { schema: { type: 'object' } } } };
  const doc = (): OpenAPIObject => ({
    openapi: '3.0.0',
    info: { title: 't', version: '1' },
    paths: {
      '/a': { get: { responses: { default: body } }, put: { responses: { default: body } } },
      '/b': { post: { responses: { default: body } } },
      '/c': { get: { responses: { '200': body, '503': body } } },
    },
  });

  it('documents default-only non-POST responses as 200 so generated clients type them as data', () => {
    const out = finalizeOpenApiDocument(doc());
    expect(Object.keys(out.paths['/a'].get!.responses)).toEqual(['200']);
    expect(Object.keys(out.paths['/a'].put!.responses)).toEqual(['200']);
  });

  it('leaves POST and explicit statuses alone', () => {
    const out = finalizeOpenApiDocument(doc());
    expect(Object.keys(out.paths['/b'].post!.responses)).toEqual(['default']);
    expect(Object.keys(out.paths['/c'].get!.responses)).toEqual(['200', '503']);
  });
});
