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
        :loading="isFetching"
        field="id"
        :data="groupData"
        group-field="type"
        group-options="data"
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
              {{
                props.option.body
                  ? props.option.body
                  : '#' + props.option.hashtag
              }}
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
const { fetchHashtags } = window.context.utils;

const {
  KeyCodes,
  TodoState,
  TodoDesc,
  Mode,
  DEFAULT_TODO_STATE,
  DEFAULT_TODO_DATA,
  DEFAULT_MODE,
} = require('./helpers');

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
      mode: DEFAULT_MODE,
      isFetching: false,
      isDragging: false,
      icon: DEFAULT_TODO_DATA.icon,
      placeholder: DEFAULT_TODO_DATA.placeholder,
      state: DEFAULT_TODO_STATE,
    };
  },
  computed: {
    inputField: function () {
      return this.$refs.todoBody.$refs.input.$refs.input;
    },
    data: function () {
      return this.mode === Mode.Todo ? this.todos : this.filterHashtags;
    },
    groupData: function () {
      const data = [];
      if (this.filterHashtags.length > 0) {
        data.push({ type: 'Products', data: this.filterHashtags });
      }

      if (this.todos.length > 0) {
        data.push({ type: 'Pending Todos', data: this.todos });
      }

      return data;
    },
    filterHashtags: function () {
      if (this.mode === Mode.Todo) return [];
      if (this.selectedHashtag === '') return this.hashtags;
      return this.hashtags.filter((el) => {
        return el.hashtag.toLowerCase().includes(this.selectedHashtag);
      });
    },
  },
  methods: {
    formatInput: function (option) {
      if (this.mode === Mode.Todo || option.body) return option.body;
      const hash = this.name.lastIndexOf(
        this.selectedHashtag,
        this.inputField.selectionStart,
      );
      return (
        this.name.substr(0, hash) +
        option.hashtag +
        this.name.substr(hash + this.selectedHashtag.length)
      );
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
      const state = TodoDesc[String(value)];
      if (!state) {
        alert(`Incorrect state: ${value}`);
        return;
      }

      this.state = value;
      this.icon = state.icon;
      if (state.placeholder) this.placeholder = state.placeholder;
    },

    keydown: function (event) {
      this.captureHashtag();

      if (
        event.keyCode == KeyCodes.arrows.down &&
        !this.isFetching &&
        this.todos.length == 0
      ) {
        this.setState(TodoState.Done);
        this.getAsyncData();
        return;
      }

      const codes = [KeyCodes.arrows.up, KeyCodes.arrows.down];
      if (codes.includes(event.keyCode)) {
        this.setState(TodoState.Done);
        return;
      }

      if (!this.name.length) return;
      if (Object.values(KeyCodes.arrows).includes(event.keyCode)) return;

      if (this.name.match(/^\/todo\b/i)) {
        this.setState(TodoState.Todo);
      } else if (this.name.match(/^\/help\b/i)) {
        this.setState(TodoState.Help);
      } else if (this.name.match(/^\/done\b/i)) {
        this.setState(TodoState.Done);
      }

      if (this.state == TodoState.Done) {
        this.getAsyncData();
      }

      return true;
    },
    iconClick: function () {
      if (this.state == TodoState.Todo) {
        this.name = this.name.replace(/^\/todo ?/, '');
        this.setState(TodoState.Done);
      } else if (this.state == TodoState.Done) {
        this.name = this.name.replace(/^\/done ?/, '');
        this.setState(TodoState.Todo);
      } else if (this.state == TodoState.Help) {
        this.setState(TodoState.Done);
      }
    },
    addAttachment: function (file, file_name = null) {
      this.$refs.attachments.addAttachment(file, file_name);
    },
    select: function (option) {
      this.selected = option;
    },
    submitForm: function () {
      if (this.mode === Mode.Hashtag) {
        const isLastHashtag = /.*#\w+\s*$/i.test(this.name);
        if (!isLastHashtag) return;
        if (!this.hashtags.find((e) => e.hashtag === this.selectedHashtag))
          return;
      }

      this.inputField.disabled = true;
      const attachments = this.$refs.attachments.getAttachments();

      if (this.selected) {
        ipc.send('completeTodo', this.selected.id, attachments);
      } else {
        let completed = this.state == TodoState.Done;
        ipc.send('createTodo', this.name, attachments, completed);
      }
    },
    captureHashtag() {
      this.selectedHashtag = getHashtag(this.inputField);
      this.mode = this.selectedHashtag === undefined ? Mode.Todo : Mode.Hashtag;
      return this.mode === Mode.Hashtag;
    },
    getAsyncData: debounce(function () {
      (async () => {
        this.isFetching = true;
        this.todos = await ipc.invoke('fetchPendingTodos', this.name);
        this.$refs.main.classList.toggle('expanded', this.todos.length);
        this.isFetching = false;
      })();
    }, 500),
    getHashtags: async function () {
      this.hashtags = await fetchHashtags();
    },
  },
  created: function () {
    this.getHashtags();
  },
};
</script>
