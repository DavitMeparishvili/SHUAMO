import en from "./messages/en.json";
import ka from "./messages/ka.json";
import type { Locale } from "./config";

export type Messages = Record<string, string>;

const catalogues: Record<Locale, Messages> = { ka, en };

export function getMessages(locale: Locale): Messages {
  return catalogues[locale];
}

export function t(messages: Messages, key: string): string {
  const value = messages[key];
  if (value === undefined) {
    throw new Error(`Missing translation for "${key}"`);
  }
  return value;
}
