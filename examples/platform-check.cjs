// Native desktop integration check using a separate disposable game process.
const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const root = join(__dirname, '..');
const target = process.argv.find(arg => arg.startsWith('--target='))?.slice(9) || `${process.platform}-${process.arch}`;
const fixture = process.argv.includes('--fixture-game');
fs.mkdirSync(join(root, 'build'), { recursive: true });
app.setPath('userData', join(root, 'build', `native-check-${process.pid}`));
app.disableHardwareAcceleration();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let game, tracker, overlay;
const until = async (predicate, label) => {
  const deadline = Date.now() + 20000;
  while (!predicate()) { if (Date.now() > deadline) throw Error(`Timeout: ${label}`); await pause(100); }
};
async function run() {
  await app.whenReady();
  if (fixture) {
    const window = new BrowserWindow({ width: 930, height: 600, x: 80, y: 70, title: 'Overlay QA game window', webPreferences: { sandbox: true } });
    await window.loadURL('data:text/html,<body style="background:%23152635;color:white;font-family:sans-serif"><h1>Overlay QA game window</h1></body>');
    window.show(); window.focus();
    console.log(JSON.stringify({ ready: true, pid: process.pid }));
    // GUI-subsystem Electron on Windows does not reliably expose piped stdin.
    let sequence = 0;
    const commandFile = join(root, 'build', `native-game-${process.pid}.json`);
    setInterval(() => {
      let command;
      try { command = JSON.parse(fs.readFileSync(commandFile, 'utf8')); }
      catch (error) { if (error.code === 'ENOENT') return; throw error; }
      if (command.sequence <= sequence) return;
      sequence = command.sequence;
      if (command.type === 'resize') window.setBounds({ x: 130, y: 100, width: 1010, height: 660 });
      if (command.type === 'focus') { window.restore(); window.show(); window.focus(); }
      if (command.type === 'minimize') window.minimize();
      if (command.type === 'fullscreen') window.setFullScreen(command.value);
      if (command.type === 'exit') app.quit();
    }, 100);
    return;
  }
  const url = pathToFileURL(join(root, 'dist/renderer/worlds-overlay.html')).href;
  overlay = new BrowserWindow({ width: 450, height: 780, show: false, title: 'Battly Overlay QA', webPreferences: { preload: join(root, 'examples/preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  if (process.platform === 'darwin') overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  const preferences = { opacity: 90, position: 'top-right', showVoice: true, showPresence: true, animations: true, width: 300, height: 0, minimal: false, offsetX: null, offsetY: null };
  const snapshot = { state: 'joined', username: 'Player', code: 'DEMO01', address: '127.0.0.1:25565', version: '1.20.1', message: '', members: [], invites: [], inviteError: '', isPublic: false, roomTitle: '', participants: [] };
  const failures = [];
  overlay.webContents.on('console-message', (_event, details) => { if (details.level === 'error') failures.push(details.message); });
  const handle = (channel, fn) => ipcMain.handle(channel, event => { if (event.sender !== overlay.webContents) throw Error('Unexpected sender'); return fn(); });
  handle('example:snapshot', () => snapshot);
  handle('example:preferences', () => preferences);
  handle('example:configure', () => undefined);
  handle('example:expand', () => undefined);
  handle('example:action', () => snapshot);
  await overlay.loadURL(url);
  overlay.webContents.send('example:expanded', true);
  overlay.webContents.send('example:version', '1.20.1');
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  game = spawn(process.execPath, [__filename, '--fixture-game', ...(process.argv.includes('--no-sandbox') ? ['--no-sandbox'] : [])], { env, stdio: ['pipe', 'pipe', 'pipe'] });
  let ready = false, gameErrors = '';
  game.stderr.on('data', chunk => { gameErrors += chunk; });
  createInterface({ input: game.stdout }).on('line', line => { try { ready ||= JSON.parse(line).ready; } catch {} });
  await until(() => ready, 'game window: ' + gameErrors);
  const native = overlay.getNativeWindowHandle();
  const id = process.platform === 'darwin' ? overlay.getMediaSourceId().split(':')[1] : (native.length === 4 ? native.readUInt32LE() : native.readBigUInt64LE()).toString();
  tracker = spawn(join(root, 'build', target, process.platform === 'win32' ? 'WindowTracker.exe' : 'WindowTracker'), [String(game.pid), id, String(process.pid)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let frame = {}, count = 0, trackerError = '', trackerExited = false;
  tracker.stderr.on('data', chunk => { trackerError += chunk; });
  tracker.on('exit', () => { trackerExited = true; });
  tracker.on('error', error => { trackerError += error.message; });
  createInterface({ input: tracker.stdout }).on('line', line => { frame = JSON.parse(line); count++; });
  let sequence = 0;
  const command = value => {
    const file = join(root, 'build', `native-game-${game.pid}.json`);
    fs.writeFileSync(file + '.tmp', JSON.stringify({ ...value, sequence: ++sequence }));
    fs.renameSync(file + '.tmp', file);
  };
  command({ type: 'focus' });
  await until(() => frame.visible && frame.width >= 800, 'visible native frame ' + trackerError);
  const initial = { ...frame }, beforeResize = count;
  command({ type: 'resize' });
  await until(() => count > beforeResize && frame.width > initial.width && frame.x !== initial.x, 'resize and movement');
  const moved = { ...frame };
  overlay.show(); overlay.focus();
  await pause(500);
  await until(() => frame.visible, 'overlay focus retains visibility');
  const afterFocus = count;
  command({ type: 'minimize' });
  await until(() => count > afterFocus && frame.visible === false, 'game minimized hides HUD');
  command({ type: 'focus' });
  await until(() => frame.visible && frame.width > 800, 'game restore');
  command({ type: 'fullscreen', value: true });
  await until(() => frame.visible && frame.fullscreen === true && frame.exclusiveFullscreen === false, 'desktop fullscreen');
  const fullscreen = { ...frame };
  command({ type: 'fullscreen', value: false });
  await until(() => frame.fullscreen === false, 'leave fullscreen');
  overlay.show(); overlay.focus();
  await overlay.webContents.executeJavaScript(`document.querySelector('[data-page="voice"]').click()`);
  await pause(300);
  const ui = await overlay.webContents.executeJavaScript(`({expanded:document.body.dataset.expanded, overflow:document.documentElement.scrollWidth>innerWidth, voice:!document.querySelector('[data-view="voice"]').hidden})`);
  if (ui.expanded !== 'true' || ui.overflow || !ui.voice || failures.length) throw Error(JSON.stringify({ ui, failures }));
  fs.writeFileSync(join(root, 'build', `native-check-${target}.png`), (await overlay.webContents.capturePage()).toPNG());
  command({ type: 'exit' });
  await until(() => trackerExited, 'tracker exits after game');
  console.log(JSON.stringify({ target, initial, moved, fullscreen, gameMinimized: true, overlayFocus: true, voiceControls: true, trackerStopped: true }));
  app.quit();
}
app.on('before-quit', () => { tracker?.kill(); game?.kill(); });
run().catch(error => { console.error(error); tracker?.kill(); game?.kill(); app.exit(1); });
