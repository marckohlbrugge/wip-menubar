const { ipcMain, BrowserWindow } = require('electron');
const logger = require('electron-log');
const { Channels } = require('./channels');

ipcMain.handle(Channels.GET_GLOBAL, async (event, key) => {
  const value = global[key];
  return Promise.resolve(value);
});

ipcMain.on(Channels.WND_CLOSE, event => {
  const wnd = BrowserWindow.fromWebContents(event.sender);
  if (!wnd) {
    logger.warn('Failed to get window from event', Channels.WND_CLOSE);
    return;
  }
  wnd.close();
});
