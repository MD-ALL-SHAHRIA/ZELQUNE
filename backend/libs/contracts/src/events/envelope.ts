import { randomUUID } from 'node:crypto';
import { z } from 'zod';

/** Event types are `<entity>.<pastTenseVerb>`, e.g. `order.placed`, `payment.verified`. */
export const EVENT_TYPE_PATTERN = /^[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*$/;

export const eventEnvelopeSchema = z.object({
  id: z.uuid(),
  type: z.string().regex(EVENT_TYPE_PATTERN),
  version: z.number().int().positive(),
  occurredAt: z.iso.datetime(),
  source: z.string().min(1),
  requestId: z.string().min(1).optional(),
  payload: z.unknown(),
});

export type EventEnvelope<TPayload = unknown> = Omit<
  z.infer<typeof eventEnvelopeSchema>,
  'payload'
> & {
  payload: TPayload;
};

export interface EventMeta {
  source: string;
  requestId?: string;
  id?: string;
  occurredAt?: Date;
}

export interface EventDefinition<TType extends string, TSchema extends z.ZodType> {
  readonly type: TType;
  readonly version: number;
  readonly payload: TSchema;
  create(payload: z.input<TSchema>, meta: EventMeta): EventEnvelope<z.output<TSchema>>;
  parse(envelope: EventEnvelope): EventEnvelope<z.output<TSchema>>;
}

/**
 * Declares a versioned event contract. Breaking payload changes must bump `version`
 * (and keep the old definition until every consumer has migrated).
 */
export function defineEvent<TType extends string, TSchema extends z.ZodType>(def: {
  type: TType;
  version: number;
  payload: TSchema;
}): EventDefinition<TType, TSchema> {
  if (!EVENT_TYPE_PATTERN.test(def.type)) {
    throw new Error(`Invalid event type "${def.type}": expected <entity>.<pastTenseVerb>`);
  }
  return {
    ...def,
    create(payload, meta) {
      return {
        id: meta.id ?? randomUUID(),
        type: def.type,
        version: def.version,
        occurredAt: (meta.occurredAt ?? new Date()).toISOString(),
        source: meta.source,
        requestId: meta.requestId,
        payload: def.payload.parse(payload),
      };
    },
    parse(envelope) {
      if (envelope.type !== def.type || envelope.version !== def.version) {
        throw new Error(
          `Expected ${def.type}@v${def.version}, got ${envelope.type}@v${envelope.version}`,
        );
      }
      return { ...envelope, payload: def.payload.parse(envelope.payload) };
    },
  };
}

export function parseEnvelope(raw: unknown): EventEnvelope {
  return eventEnvelopeSchema.parse(raw);
}
