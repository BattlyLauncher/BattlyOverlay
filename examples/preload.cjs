const { contextBridge, ipcRenderer } = require('electron');
const listen = (channel) => (listener) => {
  const handler = (_event, value) => listener(value);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};
contextBridge.exposeInMainWorld(
  'worldsOverlay',
  Object.freeze({
    language: () => Promise.resolve('es'),
    getWorldsSnapshot: () => ipcRenderer.invoke('example:snapshot'),
    worldsAction: (action) => ipcRenderer.invoke('example:action', action),
    getWorldsPublicRooms: () => Promise.resolve([]),
    worldsVoiceCommand: () => Promise.resolve(),
    worldsVoiceParty: () => Promise.resolve(),
    respondLan: () => Promise.resolve(),
    preferences: () => ipcRenderer.invoke('example:preferences'),
    configure: (value) => ipcRenderer.invoke('example:configure', value),
    compactHeight: () => Promise.resolve(),
    expand: (value) => ipcRenderer.invoke('example:expand', value),
    friends: () => Promise.resolve([]),
    searchUsers: () => Promise.resolve([]),
    faceImageUrl: () => Promise.resolve(''),
    onWorldsEvent: listen('example:event'),
    onLanPrompt: listen('example:lan'),
    onPreferences: listen('example:preferences'),
    onReveal: listen('example:reveal'),
    onExpanded: listen('example:expanded'),
    onGameVersion: listen('example:version'),
  }),
);
