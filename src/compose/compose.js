const { ipcRenderer, remote } = require('electron');

const store = require('../store');

const todoForm = document.getElementById('todo-form');
const todoBody = document.getElementById('todo-body');

todoBody.focus();

todoForm.addEventListener('submit', (event) => {
  event.preventDefault();
  // if (isInvalid(todoBody)) return;
  ipcRenderer.send('createTodo', todoBody.value);
});

ipcRenderer.on('todoCreated', (event, todo) => {
  document.getElementById('success').classList.add('visible');
  todoForm.style.display = "none";
  setTimeout(() => {
    var window = remote.getCurrentWindow();
    window.close();
  }, 1000);
  // wipUsername.parentElement.classList.remove('is-loading');
  // wipUsername.classList.toggle('is-danger', !userExists);
  // wipUsernameStatus.classList.toggle('fa-check', userExists);
  // wipUsernameStatus.classList.toggle('fa-times', !userExists);
});

function isInvalid(input) {
  const valid = !input.value && !input.disabled;
  input.classList.toggle('is-warning', valid);
  return valid;
}
