import { ORDER_CODE_ALPHABET } from '@zelqune/contracts';
import { randomInt } from 'node:crypto';

export const ORDER_CODE_LENGTH = 6;

/**
 * Random, non-sequential order code (does not leak sales volume): ZQ- + 6 chars from an
 * unambiguous alphabet (no 0/O, 1/I/L) = 31^6 ≈ 887M codes. Uniqueness is enforced by the
 * database; callers retry on collision.
 */
export function generateOrderCode(random: (max: number) => number = randomInt): string {
  let code = '';
  for (let i = 0; i < ORDER_CODE_LENGTH; i++)
    code += ORDER_CODE_ALPHABET[random(ORDER_CODE_ALPHABET.length)];
  return `ZQ-${code}`;
}
