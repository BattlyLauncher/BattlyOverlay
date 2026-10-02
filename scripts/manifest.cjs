const fs = require('node:fs');
const { createHash } = require('node:crypto');
const version = fs.readFileSync('VERSION', 'utf8').trim();
const targets = [
  'win32-ia32',
  'win32-x64',
  'linux-x64',
  'linux-arm64',
  'darwin-x64',
  'darwin-arm64',
];
const entries = targets.map((target) => {
  const entry = JSON.parse(fs.readFileSync(`release/${target}.json`, 'utf8'));
  if (entry.target !== target || entry.version !== version || entry.protocol !== 1)
    throw Error('Mismatched package');
  const bytes = fs.readFileSync(`release/${entry.file}`);
  if (
    bytes.length !== entry.bytes ||
    createHash('sha256').update(bytes).digest('hex') !== entry.sha256
  )
    throw Error('Mismatched archive');
  return entry;
});
fs.writeFileSync(
  'release/manifest.json',
  JSON.stringify({ version, protocol: 1, entries }, null, 2) + '\n',
);
fs.writeFileSync(
  'release/SHA256SUMS',
  entries.map((e) => `${e.sha256}  ${e.file}`).join('\n') + '\n',
);
