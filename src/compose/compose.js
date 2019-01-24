const { ipcRenderer, remote } = require('electron');
const debounce = require('lodash.debounce');
const store = require('../store');
const promiseIpc = require('electron-promise-ipc');

const todoBody = document.getElementById('todo-body');

ipcRenderer.on('todoSaved', (event, todo) => {
  var window = remote.getCurrentWindow();
  window.close();
});

function isInvalid(input) {
  const valid = !input.value && !input.disabled;
  input.classList.toggle('is-warning', valid);
  return valid;
}

const example = {
  data() {
    return {
      data: [],
      name: '',
      selected: null,
      isFetching: false,
      icon: 'check',
    };
  },
  methods: {
    keydown: function() {
      if (this.name.match(/^\/todo\b/i)) {
        this.icon = 'hourglass-half';
      } else {
        this.icon = 'check';
        this.getAsyncData();
      }
    },
    submitForm: function() {
      todoBody.disabled = true;

      if (app.selected) {
        // Completed an existing todo
        ipcRenderer.send('completeTodo', app.selected.id);
        console.log('selected', app.selected.id);
      } else {
        // New todo
        ipcRenderer.send('createTodo', app.name);
        console.log(app.name);
        console.log('new todo');
      }

      // if (isInvalid(todoBody)) return;
    },
    getAsyncData: debounce(function() {
      if (!this.name.length) {
        this.data = [];
        return;
      }
      this.isFetching = true;

      promiseIpc
        .send('fetchPendingTodos', this.name)
        .then(todos => {
          this.data = todos;
        })
        .catch(error => {
          this.data = [];
          throw error;
        })
        .finally(() => {
          this.isFetching = false;
        });
    }, 500),
  },
};

const app = new Vue(example);
app.$mount('#app');

const form = new Vue({
  // our data
  data: {
    name: '',
    email: '',
  },

  // our methods
  methods: {},
});

form.$mount('#todo-form');
