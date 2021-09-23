const { ipcRenderer, shell, contextBridge } = require('electron');
const store = require('./store');
const utils = require('./ipc/renderer');
const logger = require('./logger');

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
    get: (key) => store.get(key),
  },
  logger,
};

contextBridge.exposeInMainWorld('context', context);
module.exports = context;
