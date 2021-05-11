require('./compose.css');

const preload = window.context; // require('./preload');
const {
  utils: { closeCurrent },
  electron: { ipcRenderer: ipc },
} = preload;

// TODO: Use webpack bundle for it
const { require } = preload;
const debounce = require('lodash.debounce');

const Vue = require('vue/dist/vue.js');
const Buefy = require('buefy').default;
Vue.use(Buefy);

const todoBody = document.getElementById('todo-body');

const placeholders = {
  done: 'Press return to complete todo…',
  todo: 'Press return to add pending todo…',
};

const keyCodes = {
  enter: 13,
  arrows: {
    left: 37,
    up: 38,
    right: 39,
    down: 40,
  },
};

ipc.on('todoSaved', () => closeCurrent());

const example = {
  data() {
    return {
      data: [],
      attachments: [],
      name: '',
      selected: null,
      isFetching: false,
      icon: 'done',
      isDragging: false,
      placeholder: placeholders.done,
      state: 'done',
    };
  },
  methods: {
    paste: function(event) {
      let clipboard_items = event.clipboardData.items;

      for (var i = 0; i < clipboard_items.length; i++) {
        let item = clipboard_items[i];

        if (item.kind == 'file' && item.type.match('^image/')) {
          this.addAttachment(item.getAsFile(), 'Pasted Image');
        }
      }
    },

    dragenter: function() {
      this.isDragging = true;
    },

    dragleave: function() {
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

    setState(value) {
      if (value == 'done') {
        this.state = 'done';
        this.icon = 'done';
        this.placeholder = placeholders.done;
      } else if (value == 'todo') {
        this.state = 'todo';
        this.icon = 'todo';
        this.placeholder = placeholders.todo;
      } else if (value == 'help') {
        this.state = 'help';
        this.icon = 'life-ring';
      } else {
        alert(`Incorrect state: ${value}`);
      }
    },

    keydown: function(event) {
      if (
        event.keyCode == keyCodes.arrows.down &&
        !this.isFetching &&
        this.data.length == 0
      ) {
        this.setState('done');
        this.getAsyncData();
        return;
      }

      if ([keyCodes.arrows.up, keyCodes.arrows.down].includes(event.keyCode)) {
        this.setState('done');
        return;
      }

      if (!this.name.length) return;
      if (Object.values(keyCodes.arrows).includes(event.keyCode)) return;

      if (this.name.match(/^\/todo\b/i)) {
        this.setState('todo');
      } else if (this.name.match(/^\/help\b/i)) {
        this.setState('help');
      } else if (this.name.match(/^\/done\b/i)) {
        this.setState('done');
      }

      if (this.state == 'done') {
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

      if (file.path) {
        // Regular file
        this.attachments.push({ file: file_copy });
      } else {
        // Pasted image
        let _this = this;
        const reader = new FileReader();
        reader.onload = function() {
          _this.attachments.push({
            file: file_copy,
            base64: reader.result,
          });
        };
        reader.readAsDataURL(file);
      }
    },
    removeAttachment: function(index) {
      this.attachments.splice(index, 1);
    },
    select: function(option) {
      this.selected = option;
    },
    iconClick: function() {
      if (this.state == 'todo') {
        this.name = this.name.replace(/^\/todo ?/, '');
        this.setState('done');
      } else if (this.state == 'done') {
        this.name = this.name.replace(/^\/done ?/, '');
        this.setState('todo');
      } else if (this.state == 'help') {
        this.setState('done');
      }
    },
    submitForm: function() {
      todoBody.disabled = true;

      if (app.selected) {
        ipc.send('completeTodo', app.selected.id, this.attachments);
      } else {
        let completed = this.state == 'done';
        ipc.send('createTodo', app.name, this.attachments, completed);
      }
    },
    getAsyncData: debounce(function() {
      (async () => {
        this.isFetching = true;
        this.data = await ipc.invoke('fetchPendingTodos', this.name);
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

resize();

function resize() {
  let containerHeight = document.querySelector('.container').offsetHeight;
  let dropdownHeight = document.querySelector('.dropdown-menu').offsetHeight;

  let totalHeight = containerHeight + dropdownHeight;
  ipc.send('resize', totalHeight);
}

const resizeObserver = new ResizeObserver(resize, { box: 'border-box' });
// resizeObserver.observe(document.querySelector('.dropdown-menu'));
resizeObserver.observe(document.querySelector('.container'));
