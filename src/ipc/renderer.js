const { ipcRenderer } = require('electron');
const { Channels } = require('./channels');

async function getGlobal(key) {
  return ipcRenderer.invoke(Channels.GetGlobal, key);
}

async function closeCurrent() {
  return ipcRenderer.send(Channels.WndClose);
}

async function fetchHashtags() {
  return ipcRenderer.invoke(Channels.FetchHashtags);
}

module.exports = {
  getGlobal,
  closeCurrent,
  fetchHashtags,
};
