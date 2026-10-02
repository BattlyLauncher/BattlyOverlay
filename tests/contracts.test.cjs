const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

const load = (file) => {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports });
  return module.exports;
};
const { normalizeWorldsOverlayPreferences: normalize, defaultWorldsOverlayPreferences: defaults } =
  load('src/shared/social/worlds-overlay-preferences.ts');
test('preferences reject invalid dimensions and preserve valid fractional placement', () => {
  for (const change of [
    { opacity: NaN },
    { width: Infinity },
    { position: '__proto__' },
    { animations: 'yes' },
  ])
    assert.throws(() => normalize({ ...defaults, ...change }));
  const value = normalize({ ...defaults, offsetX: 0.25, offsetY: 0.75 });
  assert.equal(value.offsetX, 0.25);
  assert.equal(value.offsetY, 0.75);
});
const { parseWorldsVersion: parse } = load('src/shared/social/worlds-version.ts');
test('room labels are display data, not filesystem or network instructions', () => {
  for (const label of ['../../anything', 'https://example.invalid/file.jar', '', 'a'.repeat(300)])
    assert.equal(parse(label), null);
  assert.equal(parse('Fabric 1.20.1').version, '1.20.1');
  assert.equal(parse('fabric-loader-0.16.9-1.20.1').loader, 'fabric');
});
test('bundled languages have the same nonempty key set', () => {
  const base = JSON.parse(fs.readFileSync('src/renderer/i18n/locales/es.json', 'utf8'));
  for (const language of fs.readdirSync('src/renderer/i18n/locales')) {
    const strings = JSON.parse(fs.readFileSync(`src/renderer/i18n/locales/${language}`, 'utf8'));
    assert.deepEqual(Object.keys(strings).sort(), Object.keys(base).sort());
    assert.ok(Object.values(strings).every((value) => typeof value === 'string' && value.trim()));
  }
});
