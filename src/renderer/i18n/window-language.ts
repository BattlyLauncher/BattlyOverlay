import { UiTranslator } from './ui-translator';
import type { LanguageStrings } from './language-service';
import spanish from './locales/es.json';
import english from './locales/en.json';

export function startWindowLanguage(readLanguage: () => Promise<string>): void {
  const bundles: Partial<Record<string, () => Promise<LanguageStrings>>> = {
    ...import.meta.glob<LanguageStrings>(
      ['./locales/*.json', '!./locales/es.json', '!./locales/en.json'],
      { import: 'default' },
    ),
    './locales/es.json': () => Promise.resolve(spanish),
    './locales/en.json': () => Promise.resolve(english),
  };
  const translator = new UiTranslator(spanish);
  translator.start();
  let revision = 0;
  const refresh = async () => {
    const current = ++revision;
    try {
      const language = await readLanguage();
      const load = bundles[`./locales/${language}.json`];
      const strings = load ? await load() : english;
      if (current !== revision) return;
      document.documentElement.lang = load ? language : 'en';
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      translator.setStrings(strings);
    } catch {
      /* Keep the last loaded language while the host is unavailable. */
    }
  };
  window.addEventListener('focus', () => {
    void refresh();
  });
  void refresh();
}
