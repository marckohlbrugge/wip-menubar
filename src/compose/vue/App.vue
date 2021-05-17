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
        field="body"
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
        :icon-clickable="true"
        @icon-click="iconClick"
      >
        <template slot-scope="props">
          <div class="todo">
            <div class="todo__id">{{ props.option.id }}</div>
            <div class="todo__body">{{ props.option.body }}</div>
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

export default {
  components: {
    Attachments,
  },
  data: function () {
    return {
      data: [],
      name: '',
      isFetching: false,
      isDragging: false,
      icon: DEFAULT_STATE.icon,
      placeholder: DEFAULT_STATE.placeholder,
      state: DEFAULT_STATE_ENUM,
    };
  },
  methods: {
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
      if (
        event.keyCode == KEY_CODES.arrows.down &&
        !this.isFetching &&
        this.data.length == 0
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
    submitForm: function () {
      this.$refs.todoBody.disabled = true;
      const attachments = this.$refs.attachments.getAttachments();

      if (this.selected) {
        ipc.send('completeTodo', this.selected.id, attachments);
      } else {
        let completed = this.state == STATE_ENUM.Done;
        ipc.send('createTodo', this.name, attachments, completed);
      }
    },
    getAsyncData: debounce(function () {
      (async () => {
        this.isFetching = true;
        this.data = await ipc.invoke('fetchPendingTodos', this.name);
        this.$refs.main.classList.toggle('expanded', this.data.length);
        this.isFetching = false;
      })();
    }, 500),
  },
};
</script>
