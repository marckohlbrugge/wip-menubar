const { ipcRenderer, remote } = require('electron');

const store = require('../store');

const todoForm = document.getElementById('todo-form');
const todoBody = document.getElementById('todo-body');
const todoIcon = document.querySelector('.icon i.fas');

todoBody.focus();

todoBody.addEventListener('input', () => {
  if (todoBody.value.match(/^\/todo\b/i)) {
    todoIcon.classList.remove('fa-check');
    todoIcon.classList.add('fa-hourglass-half');
  } else {
    todoIcon.classList.remove('fa-hourglass-half');
    todoIcon.classList.add('fa-check');
  }
});

todoForm.addEventListener('submit', event => {
  event.preventDefault();
  todoBody.disabled = true;
  todoIcon.classList.remove('fa-check', 'fa-hourglass-half');
  todoIcon.classList.add('fa-spinner', 'fa-spin');
  // if (isInvalid(todoBody)) return;
  ipcRenderer.send('createTodo', todoBody.value);
});

ipcRenderer.on('todoCreated', (event, todo) => {
  todoIcon.classList.remove('fa-spinner', 'fa-spin');

  if (todo.completed_at) {
    todoIcon.classList.add('fa-check', 'success');
  } else {
    todoIcon.classList.add('fa-hourglass-half', 'success');
  }

  var window = remote.getCurrentWindow();
  window.close();

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
