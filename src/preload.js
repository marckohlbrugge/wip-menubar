const { ipcRenderer, shell, contextBridge } = require('electron');
const store = require('./store');
const { closeCurrent, getGlobal } = require('./ipc/renderer');

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
  utils: {
    closeCurrent,
    getGlobal,
  },
  store: {
    get: key => store.get(key),
  },
};

contextBridge.exposeInMainWorld('context', context);
module.exports = context;
