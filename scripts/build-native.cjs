const { execFileSync } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');
const target = process.argv[2] || `${process.platform}-${process.arch}`;
if (!/^(win32-(ia32|x64)|linux-(x64|arm64)|darwin-(x64|arm64))$/.test(target))
  throw Error('Unsupported target');
if (!target.startsWith(process.platform + '-')) throw Error('Build on the target operating system');
const output = join('build', target);
mkdirSync(output, { recursive: true });
const run = (cmd, args) =>
  execFileSync(cmd, args, { stdio: 'inherit', timeout: 120000, windowsHide: true });
if (process.platform === 'win32') {
  run(join(process.env.WINDIR, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'), [
    '/nologo',
    '/optimize+',
    `/platform:${target.endsWith('ia32') ? 'x86' : 'x64'}`,
    '/target:exe',
    `/out:${join(output, 'WindowTracker.exe')}`,
    'WindowTracker.cs',
  ]);
} else if (process.platform === 'darwin') {
  run('clang++', [
    '-std=c++17',
    '-O2',
    '-Wall',
    '-Wextra',
    '-Werror',
    '-fobjc-arc',
    '-mmacosx-version-min=12.0',
    '-arch',
    target.endsWith('arm64') ? 'arm64' : 'x86_64',
    'native/macos.mm',
    '-framework',
    'Cocoa',
    '-framework',
    'CoreGraphics',
    '-o',
    join(output, 'WindowTracker'),
  ]);
} else {
  if (target !== `${process.platform}-${process.arch}`)
    throw Error('Linux builds require a native runner for the target architecture');
  run('g++', [
    '-std=c++17',
    '-O2',
    '-Wall',
    '-Wextra',
    '-Werror',
    'native/linux.cpp',
    '-lX11',
    '-o',
    join(output, 'WindowTracker'),
  ]);
}
