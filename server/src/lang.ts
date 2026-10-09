import { z } from 'zod';

export const LANGS = ['en', 'hi', 'mr'] as const;
export type Lang = (typeof LANGS)[number];
export const LangSchema = z.enum(LANGS).default('en');

const NAMES: Record<Lang, string> = { en: 'English', hi: 'Hindi (Devanagari script)', mr: 'Marathi (Devanagari script)' };

/** Appended to every system prompt so all human-readable output follows the user's language. */
export function languageInstruction(lang: Lang = 'en'): string {
  if (lang === 'en') return '';
  return `\nLanguage: write every human-readable string value in ${NAMES[lang]}. Keep JSON keys, enum values and official place names exactly as they appear on Google Maps.`;
}
