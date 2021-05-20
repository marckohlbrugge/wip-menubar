const { ipcMain, BrowserWindow } = require('electron');
const logger = require('electron-log');
const store = require('../store');

const { Channels } = require('./channels');

ipcMain.handle(Channels.GET_GLOBAL, async (event, key) => {
  const value = global[key];
  return Promise.resolve(value);
});

ipcMain.handle(Channels.FETCH_HASHTAGS, async () => {
  const info = store.get('viewer.products');
  return Promise.resolve(info);
});

ipcMain.on(Channels.WND_CLOSE, (event) => {
  const wnd = BrowserWindow.fromWebContents(event.sender);
  if (!wnd) {
    logger.warn('Failed to get window from event', Channels.WND_CLOSE);
    return;
  }
  wnd.close();
});
