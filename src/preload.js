const { ipcRenderer, shell, contextBridge } = require('electron');
const utils = require('./ipc/renderer');
const { Channels } = require('./ipc/channels');

function logGeneric(level, ...args) {
  console.log(`[${level}]`, ...args);
  // Duplicate logs in main
  ipcRenderer.send(Channels.Log, level, ...args);
}

const context = {
  electron: {
    shell,
    ipcRenderer: {
      send: ipcRenderer.send,
      invoke: ipcRenderer.invoke,
      on: (channel, handler) => {
        ipcRenderer.on(channel, (evt, ...args) => handler(null, ...args));
      },
    },
  },
  utils,
  store: {
    get: (key) => ipcRenderer.invoke(Channels.StoreGet, key),
    getMulti: (...keys) =>
      ipcRenderer.invoke(Channels.StoreGetMultiple, ...keys),
  },
  logger: {
    log: (...args) => logGeneric('log', ...args),
    warn: (...args) => logGeneric('warn', ...args),
  },
};

contextBridge.exposeInMainWorld('context', context);
module.exports = context;
