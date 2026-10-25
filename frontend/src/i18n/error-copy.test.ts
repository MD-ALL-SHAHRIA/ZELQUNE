import { describe, expect, it } from 'vitest';
import { bn } from './dictionaries/bn';
import { en } from './dictionaries/en';
import { ERROR_COPY } from './error-copy';

describe('error copy', () => {
  it('matches the dictionaries', () => {
    for (const [lang, dict] of [
      ['en', en],
      ['bn', bn],
    ] as const) {
      expect(ERROR_COPY[lang]).toEqual({
        error: dict.ui.error,
        tryAgain: dict.ui.tryAgain,
        backHome: dict.ui.backHome,
      });
    }
  });
});
