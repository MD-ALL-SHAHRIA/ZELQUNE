import { z } from 'zod';
import { defineEvent, parseEnvelope } from './envelope';

describe('event envelope contract', () => {
  const sampleCreated = defineEvent({
    type: 'sample.created',
    version: 1,
    payload: z.object({ sampleId: z.string(), amountPaisa: z.number().int() }),
  });

  it('creates a valid envelope with id, timestamp and metadata', () => {
    const event = sampleCreated.create(
      { sampleId: 's1', amountPaisa: 349000 },
      { source: 'test-service', requestId: 'req-1' },
    );

    expect(parseEnvelope(event)).toEqual(event);
    expect(event).toMatchObject({
      type: 'sample.created',
      version: 1,
      source: 'test-service',
      requestId: 'req-1',
      payload: { sampleId: 's1', amountPaisa: 349000 },
    });
  });

  it('rejects payloads that break the contract', () => {
    expect(() =>
      sampleCreated.create({ sampleId: 's1', amountPaisa: 1.5 }, { source: 'test-service' }),
    ).toThrow();
  });

  it('rejects envelopes of a different type or version', () => {
    const event = sampleCreated.create({ sampleId: 's1', amountPaisa: 1 }, { source: 'x' });
    expect(() => sampleCreated.parse({ ...event, version: 2 })).toThrow(/sample.created@v1/);
  });

  it('enforces <entity>.<pastTenseVerb> naming', () => {
    expect(() => defineEvent({ type: 'Sample-Created', version: 1, payload: z.object({}) })).toThrow(
      /Invalid event type/,
    );
    expect(() => parseEnvelope({ id: 'not-a-uuid' })).toThrow();
  });
});
