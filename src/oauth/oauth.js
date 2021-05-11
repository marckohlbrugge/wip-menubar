require('./oauth.css');
const preload = window.context;
const { shell, ipcRenderer } = preload.electron;
const { getGlobal, closeCurrent } = preload.utils;

const oauth_button = document.getElementById('oauth');

oauth_button.addEventListener('click', async () => {
  const oauthUrl = await getGlobal('oauthUrl');
  shell.openExternal(oauthUrl);
});

const authorizationCode = document.getElementById('authorization-code');
const authorizationCodeStatus = document.getElementById(
  'authorization-code-status',
);

let authorizationCodeTypingTimer;
authorizationCode.addEventListener('input', () => {
  authorizationCode.parentElement.classList.remove('is-loading');
  clearTimeout(authorizationCodeTypingTimer);
  isInvalid(authorizationCode);

  authorizationCode.parentElement.classList.add('is-loading');
  authorizationCodeStatus.classList.remove('fa-check');
  authorizationCodeStatus.classList.remove('fa-times');

  authorizationCodeTypingTimer = setTimeout(() => {
    ipcRenderer.send('setAuthorizationCode', authorizationCode.value.trim());
  }, 1000);
});

ipcRenderer.on('authorizationCodeSet', (event, data) => {
  authorizationCode.parentElement.classList.remove('is-loading');
  authorizationCode.classList.toggle('is-danger', !data.success);
  authorizationCodeStatus.classList.toggle('fa-check', data.success);
  authorizationCodeStatus.classList.toggle('fa-times', !data.success);

  if (data.success) {
    document.getElementById('setup').style.display = 'none';
    document.getElementById('finished').style.display = 'block';
    document.getElementById('firstName').innerHTML = data.firstName;
    document.getElementById('shortcut').innerHTML = data.shortcut;
  }
});

function isInvalid(input) {
  const valid = !input.value && !input.disabled;
  input.classList.toggle('is-warning', valid);
  return valid;
}

document.getElementById('closeWindow').addEventListener('click', () => {
  closeCurrent();
});
