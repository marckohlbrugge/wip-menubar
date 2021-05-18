<template>
  <main ref="main">
    <div class="container">
      <div class="drag" v-show="isDragging">
        <div>Drop here to attach…</div>
      </div>

      <attachments ref="attachments" />

      <b-autocomplete
        id="todo-body"
        ref="todoBody"
        v-model="name"
        :data="data"
        :loading="isFetching"
        field="id"
        :custom-formatter="formatInput"
        size="is-large"
        autofocus="true"
        :icon="icon"
        icon-pack="custom"
        :placeholder="placeholder"
        dropdown-position="bottom"
        @keyup.native="keydown"
        @keydown.native.enter="submitForm"
        @drop.native="drop"
        @dragenter.native="setDragging(true)"
        @dragleave.native="setDragging(false)"
        @paste.native="paste"
        @select="select"
        :icon-clickable="true"
        @icon-click="iconClick"
      >
        <template slot-scope="props">
          <div class="todo">
            <div class="todo__id">{{ props.option.id }}</div>
            <div class="todo__body">
              {{ props.option.body ? props.option.body : props.option.name }}
            </div>
          </div>
        </template>
      </b-autocomplete>
    </div>
  </main>
</template>

<script>
const debounce = require('lodash.debounce');
const Attachments = require('./Attachments').default;
const { ipcRenderer: ipc } = window.context.electron;

const {
  KEY_CODES,
  STATE_ENUM,
  DEFAULT_STATE_ENUM,
  STATE_DATA,
  DEFAULT_STATE,
} = require('./helpers');

const MODE = {
  Todo: 0,
  Hashtag: 1,
};

function getHashtag(input) {
  const cursor = input.selectionStart;
  const value = input.value;

  const hash = value.lastIndexOf('#', cursor);
  if (hash === -1) return;

  const content = value.substr(hash, cursor - hash);
  const isHashtag = /^(#\w*)$/i.test(content);
  if (!isHashtag) return;

  const entries = value.substr(hash).match(/^#(\w*)/i);
  return entries[1].toLowerCase();
}

export default {
  components: {
    Attachments,
  },
  data: function () {
    return {
      todos: [],
      hashtags: [],
      selectedHashtag: '',
      name: '',
      selected: null,
      mode: MODE.Todo,
      isFetching: false,
      isDragging: false,
      icon: DEFAULT_STATE.icon,
      placeholder: DEFAULT_STATE.placeholder,
      state: DEFAULT_STATE_ENUM,
    };
  },
  computed: {
    inputField: function () {
      return this.$refs.todoBody.$refs.input.$refs.input;
    },
    data: function () {
      return this.mode === MODE.Todo ? this.todos : this.filterHashtags;
    },
    filterHashtags: function () {
      if (this.mode === MODE.Todo) return;
      if (this.selectedHashtag === '') return this.hashtags;
      return this.hashtags.filter((el) => {
        return el.name.toLowerCase().includes(this.selectedHashtag);
      });
    },
  },
  methods: {
    formatInput: function (option) {
      if (this.mode === MODE.Todo) return option.body;
      const hash = this.name.lastIndexOf(
        this.selectedHashtag,
        this.inputField.selectionStart,
      );
      return (
        this.name.substr(0, hash) +
        option.hashtag +
        this.name.substr(hash + this.selectedHashtag.length)
      );
      return `${clean}${option.hashtag} `;
    },
    paste: function (event) {
      let clipboard_items = event.clipboardData.items;

      for (var i = 0; i < clipboard_items.length; i++) {
        let item = clipboard_items[i];

        if (item.kind == 'file' && item.type.match('^image/')) {
          this.addAttachment(item.getAsFile(), 'Pasted Image');
        }
      }
    },

    setDragging: function (state) {
      this.isDragging = state;
    },

    drop: function (event) {
      event.preventDefault();
      this.setDragging(false);

      for (let file of event.dataTransfer.files) {
        this.addAttachment(file);
      }

      return false;
    },

    setState(value) {
      const state = STATE_DATA[String(value)];
      if (!state) {
        alert(`Incorrect state: ${value}`);
        return;
      }

      this.state = value;
      this.icon = state.icon;
      if (state.placeholder) this.placeholder = state.placeholder;
    },

    keydown: function (event) {
      if (this.isHashtag()) return;

      if (
        event.keyCode == KEY_CODES.arrows.down &&
        !this.isFetching &&
        this.todos.length == 0
      ) {
        this.setState(STATE_ENUM.Done);
        this.getAsyncData();
        return;
      }

      const codes = [KEY_CODES.arrows.up, KEY_CODES.arrows.down];
      if (codes.includes(event.keyCode)) {
        this.setState(STATE_ENUM.Done);
        return;
      }

      if (!this.name.length) return;
      if (Object.values(KEY_CODES.arrows).includes(event.keyCode)) return;

      if (this.name.match(/^\/todo\b/i)) {
        this.setState(STATE_ENUM.Todo);
      } else if (this.name.match(/^\/help\b/i)) {
        this.setState(STATE_ENUM.Help);
      } else if (this.name.match(/^\/done\b/i)) {
        this.setState(STATE_ENUM.Done);
      }

      if (this.state == STATE_ENUM.Done) {
        this.getAsyncData();
      }

      return true;
    },
    iconClick: function () {
      if (this.state == STATE_ENUM.Todo) {
        this.name = this.name.replace(/^\/todo ?/, '');
        this.setState(STATE_ENUM.Done);
      } else if (this.state == STATE_ENUM.Done) {
        this.name = this.name.replace(/^\/done ?/, '');
        this.setState(STATE_ENUM.Todo);
      } else if (this.state == STATE_ENUM.Help) {
        this.setState(STATE_ENUM.Done);
      }
    },
    addAttachment: function (file, file_name = null) {
      this.$refs.attachments.addAttachment(file, file_name);
    },
    select: function (option) {
      this.selected = option;
    },
    submitForm: function () {
      if (this.mode === MODE.Hashtag) return;

      this.inputField.disabled = true;
      const attachments = this.$refs.attachments.getAttachments();

      if (this.selected) {
        ipc.send('completeTodo', this.selected.id, attachments);
      } else {
        let completed = this.state == STATE_ENUM.Done;
        ipc.send('createTodo', this.name, attachments, completed);
      }
    },
    isHashtag() {
      this.selectedHashtag = getHashtag(this.inputField);
      this.mode = this.selectedHashtag === undefined ? MODE.Todo : MODE.Hashtag;
      return this.mode === MODE.Hashtag;
    },
    getAsyncData: debounce(function () {
      (async () => {
        this.isFetching = true;
        this.todos = await ipc.invoke('fetchPendingTodos', this.name);
        this.$refs.main.classList.toggle('expanded', this.todos.length);
        this.isFetching = false;
      })();
    }, 500),
    getHashtags: function () {
      // return store.get('viewer.products');
      this.hashtags = [
        {
          id: '15',
          name: 'WIP',
          hashtag: 'wip',
        },
        {
          id: '2303',
          name: 'WIP Menubar',
          hashtag: 'menubar',
        },
        {
          id: '181',
          name: 'Startup Jobs',
          hashtag: 'startupjobs',
        },
      ];
    },
  },
  created: function () {
    this.getHashtags();
  },
};
</script>
