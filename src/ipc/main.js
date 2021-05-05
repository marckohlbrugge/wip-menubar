const { ipcMain, BrowserWindow } = require('electron');
const logger = require('electron-timber');
const { Channels } = require('./channels');

ipcMain.handle(Channels.GET_GLOBAL, async (evt, key) => {
  const value = global[key];
  return Promise.resolve(value);
});

ipcMain.on(Channels.WND_CLOSE, evt => {
  const wnd = BrowserWindow.fromWebContents(evt.sender);
  if (!wnd) {
    logger.warn('Failed to get window from event', Channels.WND_CLOSE);
    return;
  }
  wnd.close();
});
