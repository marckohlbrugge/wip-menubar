const { ipcRenderer, remote } = require('electron');
const debounce = require('lodash.debounce');
const ipc = require('electron-better-ipc');
const logger = require('electron-timber');

const todoBody = document.getElementById('todo-body');

ipcRenderer.on('todoSaved', () => {
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
      attachments: [],
      name: '',
      selected: null,
      isFetching: false,
      icon: 'check',
      isDragging: false,
    };
  },
  methods: {
    dragenter: function(event) {
      console.log('drag enter');
      this.isDragging = true;
    },
    dragleave: function(event) {
      console.log('drag leave');
      this.isDragging = false;
    },
    drop: function(event) {
      event.preventDefault();
      this.dragleave();

      for (let file of event.dataTransfer.files) {
        console.log(file);
        let path = file.path;
        let file_copy = {
          path: file.path,
          name: file.name,
          size: file.size,
          obj: file,
        };
        this.attachments.push({
          file: file_copy,
          url: URL.createObjectURL(file),
        });
      }

      return false;
    },
    keydown: function(event) {
      // Ignore arrow keys
      if ([37, 38, 39, 40].includes(event.keyCode)) {
        return;
      }
      if (this.name.match(/^\/todo\b/i)) {
        this.icon = 'hourglass-half';
      } else if (this.name.match(/^\/help\b/i)) {
        this.icon = 'life-ring';
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
        ipcRenderer.send('completeTodo', app.selected.id, this.attachments);
        logger.log('selected', app.selected.id);
      } else {
        // New todo
        ipcRenderer.send('createTodo', app.name, this.attachments);
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
        document
          .querySelector('main')
          .classList.toggle('expanded', this.data.length);
        this.isFetching = false;
      })();
    }, 500),
  },
};

const app = new Vue(example);
app.$mount('#app');
