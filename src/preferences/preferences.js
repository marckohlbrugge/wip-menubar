require('./preferences.css');
require('../bugsnag/renderer');
const {
  electron: { ipcRenderer, shell },
  store,
  logger,
} = window.context;

const shortcut = document.getElementById('shortcut');
const launchAtLoginCheckbox = document.getElementById(
  'launch-at-login-checkbox',
);
const developmentModeCheckbox = document.getElementById(
  'development-mode-checkbox',
);
const notificationCheckbox = document.getElementById('notification-checkbox');
const notificationTime = document.getElementById('notification-time');
const broadcastCheckbox = document.getElementById('broadcast-activity');

// Open all links in external browser
document.addEventListener('click', function (event) {
  if (event.target.tagName === 'A' && event.target.href.startsWith('http')) {
    event.preventDefault();
    shell.openExternal(event.target.href);
  }
});

async function loadStore() {
  const setChecked = (item) => (v) => (item.checked = v);
  const setValue = (item) => (v) => (item.value = v);
  const items = {
    shortcut: setValue(shortcut),
    autoLaunch: setChecked(launchAtLoginCheckbox),
    development: setChecked(developmentModeCheckbox),
    'notification.isEnabled': setChecked(notificationCheckbox),
    broadcast: setChecked(broadcastCheckbox),
    'notification.time': (v) => {
      notificationTime.disabled = !v;
      notificationTime.value = v;
    },
  };

  const keys = Object.keys(items);
  const values = await store.getMulti(...keys);
  for (const [key, value] of Object.entries(values)) {
    items[key](value);
  }
}
loadStore().then(() => logger.log('Store fetched'));

let shortcutTypingTimer;
shortcut.addEventListener('input', () => {
  clearTimeout(shortcutTypingTimer);

  shortcutTypingTimer = setTimeout(() => {
    ipcRenderer.send('setShortcut', shortcut.value);
  }, 1000);
});

launchAtLoginCheckbox.addEventListener('change', () => {
  ipcRenderer.send('activateLaunchAtLogin', launchAtLoginCheckbox.checked);
});

developmentModeCheckbox.addEventListener('change', () => {
  ipcRenderer.send('activateDevelopmentMode', developmentModeCheckbox.checked);
});

notificationCheckbox.addEventListener('change', () => {
  notificationTime.disabled = !notificationCheckbox.checked;
  ipcRenderer.send('activateNotifications', notificationCheckbox.checked);
});

notificationTime.addEventListener('input', () => {
  if (isInvalid(notificationTime)) return;
  ipcRenderer.send('setNotificationTime', notificationTime.value);
});

broadcastCheckbox.addEventListener('change', () => {
  ipcRenderer.send('setBroadcast', broadcastCheckbox.checked);
});

function isInvalid(input) {
  const valid = !input.value && !input.disabled;
  input.classList.toggle('is-warning', valid);
  return valid;
}

document.getElementById('oauth').addEventListener('click', () => {
  ipcRenderer.send('resetOAuth');
});
