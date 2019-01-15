const Store = require('electron-store');

module.exports = new Store({
  defaults: {
    username: '',
    autoLaunch: false,
    syncInterval: 15,
    development: false,
    shortcut: 'Ctrl+Space',
    notification: {
      isEnabled: false,
      time: '20:00',
    },
  },
});
