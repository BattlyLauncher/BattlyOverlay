const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const { createInterface } = require('node:readline');
const root = join(__dirname, '..');
const smoke = process.argv.includes('--smoke');
const profile = join(root, 'build', `preview-profile-${process.pid}`);
mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
if (smoke) app.disableHardwareAcceleration();
const target =
  process.argv.find((arg) => arg.startsWith('--target='))?.slice(9) ||
  `${process.platform}-${process.arch}`;
let window, tracker;
let preferences = {
  opacity: 90,
  position: 'top-right',
  showVoice: true,
  showPresence: true,
  animations: true,
  width: 300,
  height: 0,
  minimal: false,
  offsetX: null,
  offsetY: null,
};
let snapshot = {
  state: 'idle',
  username: 'Player',
  code: '',
  address: '',
  version: '1.20.1',
  message: '',
  members: [],
  invites: [],
  inviteError: '',
  isPublic: false,
  roomTitle: '',
  participants: [],
};
const url = pathToFileURL(join(root, 'dist/renderer/worlds-overlay.html')).href;
const handle = (channel, listener) =>
  ipcMain.handle(channel, (event, ...args) => {
    if (event.sender !== window.webContents || event.senderFrame?.url !== url)
      throw Error('Unexpected sender');
    return listener(...args);
  });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function run() {
  await app.whenReady();
  window = new BrowserWindow({
    width: 450,
    height: 780,
    title: 'Battly Overlay · Preview',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  const failures = [];
  window.webContents.on('console-message', (_event, details) => {
    if (details.level === 'error') failures.push(details.message);
  });
  handle('example:snapshot', () => snapshot);
  handle('example:preferences', () => preferences);
  handle('example:clipboard', value => {
    if(typeof value!=='string'||value.length>32768)throw Error('Invalid clipboard text');
    clipboard.writeText(value);return clipboard.readText()===value;
  });
  handle('example:configure', (value) => {
    preferences = value;
    window.webContents.send('example:preferences', preferences);
  });
  handle('example:expand', (value) => window.webContents.send('example:expanded', Boolean(value)));
  handle('example:action', (action) => {
    if (action?.type === 'host') snapshot = { ...snapshot, state: 'hosting', code: 'DEMO01' };
    if (action?.type === 'leave') snapshot = { ...snapshot, state: 'idle', code: '' };
    window.webContents.send('example:event', { type: 'snapshot', snapshot });
    return snapshot;
  });
  await window.loadURL(url);
  window.show();
  window.focus();
  window.webContents.send('example:expanded', true);
  window.webContents.send('example:version', '1.20.1');
  if (!smoke) return;
  const handleBytes = window.getNativeWindowHandle();
  const nativeId =
    process.platform === 'darwin'
      ? window.getMediaSourceId().split(':')[1]
      : (handleBytes.length === 4
          ? handleBytes.readUInt32LE()
          : handleBytes.readBigUInt64LE()
        ).toString();
  tracker = spawn(
    join(
      root,
      'build',
      target,
      process.platform === 'win32' ? 'WindowTracker.exe' : 'WindowTracker',
    ),
    [String(process.pid), nativeId, String(process.pid)],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  await new Promise((resolve, reject) => {
    let lastFrame = '';
    const timer = setTimeout(() => {
      tracker.kill();
      reject(Error('No native window frame within 10 seconds: ' + lastFrame));
    }, 10000);
    const lines = createInterface({ input: tracker.stdout });
    tracker.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    tracker.once('exit', (code) => {
      clearTimeout(timer);
      reject(Error('Tracker exited before a frame: ' + code));
    });
    lines.on('line', (line) => {
      lastFrame = line.slice(0, 512);
      try {
        const frame = JSON.parse(line);
        if (frame.width >= 320 && frame.height >= 200) {
          clearTimeout(timer);
          lines.close();
          resolve();
        }
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  });
  await pause(600);
  const visible = await window.webContents.executeJavaScript(
    `({expanded:document.body.dataset.expanded, title:document.querySelector('[data-status]').textContent, overflow:document.documentElement.scrollWidth>innerWidth})`,
  );
  if (visible.expanded !== 'true' || !visible.title || visible.overflow || failures.length)
    throw Error(JSON.stringify({ visible, failures }));
  await window.webContents.executeJavaScript(
    `document.querySelector('[data-page="voice"]').click()`,
  );
  await pause(150);
  mkdirSync(join(root, 'build'), { recursive: true });
  writeFileSync(
    join(root, 'build', `preview-${target}.png`),
    (await window.webContents.capturePage()).toPNG(),
  );
  console.log(JSON.stringify({ nativeFrame: true, interfaceLoaded: true, target }));
  tracker.kill();
  tracker = undefined;
  app.quit();
}
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => tracker?.kill());
run().catch((error) => {
  console.error(error);
  tracker?.kill();
  app.exit(1);
});
