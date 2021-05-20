const { ipcRenderer } = require('electron');
const { Channels } = require('./channels');

async function getGlobal(key) {
  return ipcRenderer.invoke(Channels.GET_GLOBAL, key);
}

async function closeCurrent() {
  return ipcRenderer.send(Channels.WND_CLOSE);
}

async function fetchHashtags() {
  return ipcRenderer.invoke(Channels.FETCH_HASHTAGS);
}

module.exports = {
  getGlobal,
  closeCurrent,
  fetchHashtags,
};
