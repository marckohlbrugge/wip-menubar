const { ipcMain, BrowserWindow } = require('electron');
const logger = require('../logger');
const store = require('../store');

const { Channels } = require('./channels');

ipcMain.handle(Channels.GetGlobal, async (event, key) => {
  const value = global[key];
  return Promise.resolve(value);
});

ipcMain.handle(Channels.FetchHashtags, async () => {
  const info = store.get('viewer.products');
  return Promise.resolve(info);
});

ipcMain.on(Channels.WndClose, (event) => {
  const wnd = BrowserWindow.fromWebContents(event.sender);
  if (!wnd) {
    logger.warn('Failed to get window from event', Channels.WndClose);
    return;
  }
  wnd.close();
});
