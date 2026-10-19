import 'server-only';
import { type Locale } from './config';
import { bn } from './dictionaries/bn';
import { type Dictionary, en } from './dictionaries/en';

const dictionaries: Record<Locale, Dictionary> = { en, bn };

export function getDictionary(lang: Locale): Dictionary {
  return dictionaries[lang];
}
