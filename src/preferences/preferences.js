const { ipcRenderer } = require('electron');

const store = require('../store');

const wipUsername = document.getElementById('wip-username');
const wipUsernameStatus = document.getElementById('wip-username-status');
const wipApiKey = document.getElementById('wip-api-key');
const wipApiKeyStatus = document.getElementById('wip-api-key-status');
const wipSyncInterval = document.getElementById('wip-sync-interval');
const launchAtLoginCheckbox = document.getElementById(
  'launch-at-login-checkbox',
);
const notificationCheckbox = document.getElementById('notification-checkbox');
const notificationTime = document.getElementById('notification-time');

wipUsername.value = store.get('username');
wipApiKey.value = store.get('api-key');
wipSyncInterval.value = store.get('syncInterval');
launchAtLoginCheckbox.checked = store.get('autoLaunch');
notificationCheckbox.checked = store.get('notification.isEnabled');
notificationTime.value = store.get('notification.time');
notificationTime.disabled = !store.get('notification.isEnabled');

if (!wipUsername.value) {
  wipUsername.focus();
  isInvalid(wipUsername);
}

let usernameTypingTimer;
wipUsername.addEventListener('input', () => {
  wipUsername.parentElement.classList.remove('is-loading');
  clearTimeout(usernameTypingTimer);
  isInvalid(wipUsername);

  wipUsername.parentElement.classList.add('is-loading');
  wipUsernameStatus.classList.remove('fa-check');
  wipUsernameStatus.classList.remove('fa-times');

  usernameTypingTimer = setTimeout(() => {
    ipcRenderer.send('setUsername', wipUsername.value);
  }, 1000);
});

let apiKeyTypingTimer;
wipApiKey.addEventListener('input', () => {
  wipApiKey.parentElement.classList.remove('is-loading');
  clearTimeout(apiKeyTypingTimer);
  isInvalid(wipApiKey);

  wipApiKey.parentElement.classList.add('is-loading');
  wipApiKeyStatus.classList.remove('fa-check');
  wipApiKeyStatus.classList.remove('fa-times');

  apiKeyTypingTimer = setTimeout(() => {
    ipcRenderer.send('setApiKey', wipApiKey.value);
  }, 1000);
});

wipSyncInterval.addEventListener('input', () => {
  if (isInvalid(wipSyncInterval)) return;
  const syncInterval = parseInt(wipSyncInterval.value, 10);
  if (syncInterval > 0) {
    ipcRenderer.send('setSyncInterval', syncInterval);
  } else {
    wipSyncInterval.classList.add('is-warning');
  }
});

launchAtLoginCheckbox.addEventListener('change', () => {
  ipcRenderer.send('activateLaunchAtLogin', launchAtLoginCheckbox.checked);
});

notificationCheckbox.addEventListener('change', () => {
  notificationTime.disabled = !notificationCheckbox.checked;
  ipcRenderer.send('activateNotifications', notificationCheckbox.checked);
});

notificationTime.addEventListener('input', () => {
  if (isInvalid(notificationTime)) return;
  ipcRenderer.send('setNotificationTime', notificationTime.value);
});

ipcRenderer.on('usernameSet', (event, userExists) => {
  wipUsername.parentElement.classList.remove('is-loading');
  wipUsername.classList.toggle('is-danger', !userExists);
  wipUsernameStatus.classList.toggle('fa-check', userExists);
  wipUsernameStatus.classList.toggle('fa-times', !userExists);
});

ipcRenderer.on('apiKeySet', (event, apiKeyWorks) => {
  wipApiKey.parentElement.classList.remove('is-loading');
  wipApiKey.classList.toggle('is-danger', !apiKeyWorks);
  wipApiKeyStatus.classList.toggle('fa-check', apiKeyWorks);
  wipApiKeyStatus.classList.toggle('fa-times', !apiKeyWorks);
});

function isInvalid(input) {
  const valid = !input.value && !input.disabled;
  input.classList.toggle('is-warning', valid);
  return valid;
}
