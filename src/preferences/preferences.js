require('./preferences.css');
require('../bugsnag/renderer');
const preload = window.context;
const {
  electron: { ipcRenderer, shell },
  store,
} = preload;

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

shortcut.value = store.get('shortcut');
launchAtLoginCheckbox.checked = store.get('autoLaunch');
developmentModeCheckbox.checked = store.get('development');
notificationCheckbox.checked = store.get('notification.isEnabled');
notificationTime.value = store.get('notification.time');
notificationTime.disabled = !store.get('notification.isEnabled');
broadcastCheckbox.checked = store.get('broadcast');

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
