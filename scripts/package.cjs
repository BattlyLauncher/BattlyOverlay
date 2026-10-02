const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const AdmZip = require('adm-zip');
const version = fs.readFileSync('VERSION', 'utf8').trim();
if (!/^\d+\.\d+\.\d+$/.test(version) || require('../package.json').version !== version)
  throw Error('VERSION and package.json must agree');
const target = process.argv[2] || `${process.platform}-${process.arch}`;
if (!/^(win32-(ia32|x64)|linux-(x64|arm64)|darwin-(x64|arm64))$/.test(target))
  throw Error('Unsupported target');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const zip = new AdmZip();
const files = [];
function add(disk, name, executable = false) {
  const stat = fs.lstatSync(disk);
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Not a regular file: ' + disk);
  const bytes = fs.readFileSync(disk);
  zip.addFile(name, bytes, '', executable ? 0o100755 << 16 : 0o100644 << 16);
  files.push({ path: name, bytes: bytes.length, sha256: hash(bytes), executable });
}
function walk(disk, prefix) {
  for (const entry of fs
    .readdirSync(disk, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const source = path.join(disk, entry.name),
      name = prefix + '/' + entry.name;
    if (entry.isDirectory()) walk(source, name);
    else add(source, name);
  }
}
walk('dist/renderer', 'renderer');
const tracker = target.startsWith('win32-') ? 'WindowTracker.exe' : 'WindowTracker';
add(path.join('build', target, tracker), tracker, true);
add('LICENSE', 'LICENSE');
add('THIRD-PARTY-NOTICES.md', 'THIRD-PARTY-NOTICES.md');
add('licenses/Poppins-OFL.txt', 'licenses/Poppins-OFL.txt');
const bytes = zip.toBuffer(),
  file = `battly-overlay-${target}.zip`;
fs.mkdirSync('release', { recursive: true });
fs.writeFileSync(path.join('release', file), bytes);
fs.writeFileSync(
  path.join('release', `${target}.json`),
  JSON.stringify(
    { version, protocol: 1, target, file, bytes: bytes.length, sha256: hash(bytes), files },
    null,
    2,
  ) + '\n',
);
console.log(file);
