const { ipcRenderer, shell, contextBridge } = require('electron');
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
};
contextBridge.exposeInMainWorld('context', context);

module.exports = context;
