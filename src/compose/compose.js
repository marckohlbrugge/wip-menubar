const { ipcRenderer, remote } = require('electron');
const debounce = require('lodash.debounce');
const store = require('../store');
const ipc = require('electron-better-ipc');
const logger = require('electron-timber');

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
    keydown: function(event) {
      if ([37, 38, 39, 40].includes(event.keyCode)) {
        console.log(event);
        return;
      }
      if (this.name.match(/^\/todo\b/i)) {
        this.icon = 'hourglass-half';
      } else {
        this.icon = 'check';
        this.getAsyncData();
      }
      return true;
    },
    submitForm: function() {
      todoBody.disabled = true;

      if (app.selected) {
        // Completed an existing todo
        ipcRenderer.send('completeTodo', app.selected.id);
        logger.log('selected', app.selected.id);
      } else {
        // New todo
        ipcRenderer.send('createTodo', app.name);
        logger.log(app.name);
        logger.log('new todo');
      }

      // if (isInvalid(todoBody)) return;
    },
    getAsyncData: debounce(function() {
      if (!this.name.length) {
        this.data = [];
        document.querySelector('main').classList.remove('expanded');
        return;
      }
      (async () => {
        this.isFetching = true;
        this.data = await ipc.callMain('fetchPendingTodos', this.name);
        if(this.data) {
          document.querySelector('main').classList.add('expanded');
        }
        this.isFetching = false;
      })();
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
