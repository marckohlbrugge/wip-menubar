const { ipcMain, BrowserWindow, shell } = require('electron');
const logger = require('../logger');
const store = require('../store');

const { Channels } = require('./channels');

ipcMain.handle(Channels.GetGlobal, async (event, key) => {
  const value = global[key];
  return Promise.resolve(value);
});

ipcMain.handle(Channels.FetchHashtags, async () => {
  const info = store.get('viewer.projects');
  return Promise.resolve(info);
});

ipcMain.handle(Channels.StoreGet, async (event, key) => {
  const value = store.get(key);
  return Promise.resolve(value);
});

ipcMain.handle(Channels.StoreGetMultiple, async (event, ...args) => {
  let result = {};
  for (let arg of args) {
    result[arg] = store.get(arg);
  }
  return Promise.resolve(result);
});

ipcMain.on(Channels.OpenExternalUrl, async (event, url) => {
  shell.openExternal(url);
});

ipcMain.on(Channels.Log, async (event, level, ...args) => {
  const levels = { log: logger.log, warn: logger.warn };
  let fn = levels[level] || logger.log;
  fn('[renderer] ', ...args);
});

ipcMain.on(Channels.WndClose, (event) => {
  const wnd = BrowserWindow.fromWebContents(event.sender);
  if (!wnd) {
    logger.warn('Failed to get window from event', Channels.WndClose);
    return;
  }
  wnd.close();
});
