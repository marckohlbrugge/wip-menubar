const Store = require('electron-store');

module.exports = new Store({
  defaults: {
    autoLaunch: false,
    development: false,
    shortcut: 'Ctrl+Space',
    notification: {
      isEnabled: false,
      time: '20:00',
    },
    broadcast: false,
  },
});
