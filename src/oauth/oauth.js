const { remote, ipcRenderer, shell } = require('electron');

const oauth_button = document.getElementById('oauth');

oauth_button.addEventListener('click', () => {
  const url = 'http://wip.test/oauth/authorize?client_id=3225b01300130110b77dfce9bff5fd3d99807c1f77d9ba554fb3b885ee0a3c3c&response_type=code&redirect_uri=urn:ietf:wg:oauth:2.0:oob';
  shell.openExternal(url);
});

const authorizationCode = document.getElementById('authorization-code');
const authorizationCodeStatus = document.getElementById('authorization-code-status');

let authorizationCodeTypingTimer;
authorizationCode.addEventListener('input', () => {
  authorizationCode.parentElement.classList.remove('is-loading');
  clearTimeout(authorizationCodeTypingTimer);
  isInvalid(authorizationCode);

  authorizationCode.parentElement.classList.add('is-loading');
  authorizationCodeStatus.classList.remove('fa-check');
  authorizationCodeStatus.classList.remove('fa-times');

  authorizationCodeTypingTimer = setTimeout(() => {
    console.log('setting…');
    console.log(authorizationCode.value);
    ipcRenderer.send('setAuthorizationCode', authorizationCode.value);
  }, 1000);
});

ipcRenderer.on('authorizationCodeSet', (event, data) => {

  authorizationCode.parentElement.classList.remove('is-loading');
  authorizationCode.classList.toggle('is-danger', !data.success);
  authorizationCodeStatus.classList.toggle('fa-check', data.success);
  authorizationCodeStatus.classList.toggle('fa-times', !data.success);

  if(data.success) {
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
  remote.getCurrentWindow().close();
});
