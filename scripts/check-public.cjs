const fs = require('node:fs');
const path = require('node:path');
const excluded = new Set(['.git', 'node_modules', 'dist', 'build', 'release']);
let files = 0;
function walk(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    if (excluded.has(item.name)) continue;
    const name = path.join(directory, item.name);
    if (item.isSymbolicLink()) throw Error('Symlink in public source: ' + name);
    if (item.isDirectory()) {
      walk(name);
      continue;
    }
    files++;
    if (/^\.env|\.(pem|pfx|p12|key)$/i.test(item.name))
      throw Error('Private configuration in public source: ' + name);
    if (
      !/\.(ts|js|cjs|mjs|json|md|html|yml|cs|cpp|mm)$/.test(item.name) ||
      item.name === 'check-public.cjs'
    )
      continue;
    const text = fs.readFileSync(name, 'utf8');
    if (
      /api\.battlylauncher\.com|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|mongodb(?:\+srv)?:\/\//i.test(
        text,
      )
    )
      throw Error('Service configuration or private key in public source: ' + name);
  }
}
walk('.');
console.log(`Checked ${files} public source files`);
