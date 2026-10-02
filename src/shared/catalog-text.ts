interface Template {
  prefix: string;
  pattern: RegExp;
  keys: string[];
  target: string;
}
let activeTranslate = (source: string): string => source;
/** Catalog markup is presentation, never executable HTML or visible source code. */
export function plainLocaleText(value: string): string {
  const text = value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  if (typeof document === 'undefined') return text;
  const decoder = document.createElement('textarea');
  decoder.innerHTML = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return decoder.value;
}
const escapePattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Matches only catalogued sentences; captured names and paths are never translated. */
export function createTextTranslator(entries: Map<string, string>): (source: string) => string {
  const dictionary = new Map<string, string>();
  for (const [source, target] of entries) {
    const key = plainLocaleText(source).replace(/\s+/g, ' ').trim();
    // Keep the catalogue priority when markup aliases normalize to the same text.
    if (key && !dictionary.has(key)) dictionary.set(key, plainLocaleText(target));
  }
  const templates: Template[] = [];
  for (const [source, target] of dictionary) {
    const slots = [...source.matchAll(/\{(\d+)\}/g)];
    if (!slots.length || slots.length > 8 || source.replace(/\{\d+\}/g, '').trim().length < 4)
      continue;
    let offset = 0,
      pattern = '^';
    const keys: string[] = [];
    for (const slot of slots) {
      pattern += escapePattern(source.slice(offset, slot.index)) + '([\\s\\S]*?)';
      keys.push(slot[1]);
      offset = slot.index + slot[0].length;
    }
    pattern += escapePattern(source.slice(offset)) + '$';
    templates.push({
      prefix: source.slice(0, slots[0].index),
      pattern: new RegExp(pattern),
      keys,
      target,
    });
  }
  templates.sort((a, b) => b.prefix.length - a.prefix.length);
  return (source: string): string => {
    const original = source.trim();
    const trimmed = original.replace(/\s+/g, ' ');
    const direct = dictionary.get(trimmed);
    if (direct) return source.replace(original, () => direct);
    if (trimmed.length > 8000) return source;
    for (const template of templates) {
      if (!trimmed.startsWith(template.prefix)) continue;
      const match = template.pattern.exec(trimmed);
      if (!match) continue;
      const values = new Map(template.keys.map((key, index) => [key, match[index + 1]]));
      const translated = template.target.replace(
        /\{(\d+)\}/g,
        (slot, key: string) => values.get(key) ?? slot,
      );
      return source.replace(original, () => translated);
    }
    return source;
  };
}

export function configureUiText(entries: Map<string, string>): void {
  activeTranslate = createTextTranslator(entries);
}
export function translateUiText(source: string): string {
  return activeTranslate(source);
}

export function setUiText(element: HTMLElement, source: string): void {
  element.dataset.uiSource = source;
  element.textContent = translateUiText(source);
}
