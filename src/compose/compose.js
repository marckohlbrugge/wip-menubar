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
    paste: function(event) {
      let clipboard_items = event.clipboardData.items;

      for (var i = 0; i < clipboard_items.length; i++) {
        let item = clipboard_items[i];

        if(item.kind == "file" && item.type.match("^image/")) {
          this.addAttachment(item.getAsFile(), "Pasted Image");
        }
      }
    },
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
        this.addAttachment(file);
      }

      return false;
    },
    keydown: function(event) {
      if (event.keyCode == 40 && this.name.match(/^\s*$/) && !this.isFetching && !this.data) {
        this.icon = 'check';
        this.getAsyncData();
        return;
      }
      if (!this.name.length) {
        return;
      }
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
    addAttachment: function(file, file_name = null) {
      if (file_name) {
        file_name = [file_name, file.name.split('.').pop()].join('.');
      }

      let file_copy = {
        path: file.path,
        name: file_name || file.name,
        size: file.size,
        obj: file,
      };

      this.attachments.push({
        file: file_copy,
        url: URL.createObjectURL(file),
      });
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
    },
    getAsyncData: debounce(function() {
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
