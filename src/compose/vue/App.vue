<template>
  <main ref="main">
    <div class="container">
      <div class="drag" v-show="isDragging">
        <div>Drop here to attach…</div>
      </div>

      <attachments ref="attachments" />

      <b-autocomplete id="todo-body" ref="todoBody" v-model="name" field="id" :data="groupData" group-field="type"
        group-options="data" :custom-formatter="formatInput" size="is-large" autofocus="true" icon="done"
        icon-pack="custom" placeholder="Press return to complete todo…" dropdown-position="bottom" @keyup.native="keydown"
        @keydown.native.enter="submitForm" @drop.native="drop" @dragenter.native="setDragging(true)"
        @dragleave.native="setDragging(false)" @paste.native="paste" @select="select">
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
const { logger } = window.context;

const {
  KeyCodes,
  TodoDesc,
  Mode,
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
      hashtags: [],
      selectedHashtag: '',
      name: '',
      selected: null,
      mode: DEFAULT_MODE,
      isDragging: false,
    };
  },
  computed: {
    inputField: function () {
      return this.$refs.todoBody.$refs.input.$refs.input;
    },
    data: function () {
      return this.filterHashtags;
    },
    groupData: function () {
      const data = [];
      if (this.filterHashtags.length > 0) {
        data.push({ type: 'Projects', data: this.filterHashtags });
      }

      return data;
    },
    filterHashtags: function () {
      if (this.selectedHashtag === '') return this.hashtags;
      const items = this.hashtags.filter((el) => {
        return el.hashtag.toLowerCase().includes(this.selectedHashtag);
      });
      if (items.length === 0 || items.length > 1) return items;
      if (items[0].hashtag === this.selectedHashtag) return [];
      return items;
    },
  },
  methods: {
    formatInput: function (option) {
      if (option.body) return option.body;
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

    // I think we use this for filtering hashtags
    keydown: function (event) {
      this.captureHashtag();

      if (event.keyCode == KeyCodes.arrows.down) {
        return;
      }

      if (!this.name.length) return;
      if (Object.values(KeyCodes.arrows).includes(event.keyCode)) return;

      return true;
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
      }

      this.inputField.disabled = true;
      const attachments = this.$refs.attachments.getAttachments();

      if (this.selected) {
        logger.log('Sending "completeTodo" with', this.selected);
        ipc.send('completeTodo', this.selected.id, attachments);
      } else {
        logger.log('Sending "createTodo" with text', this.name);
        ipc.send('createTodo', this.name, attachments);
      }
    },
    captureHashtag() {
      this.selectedHashtag = getHashtag(this.inputField);
      this.mode = this.selectedHashtag === undefined ? Mode.Todo : Mode.Hashtag;
      return this.mode === Mode.Hashtag;
    },
    getHashtags: async function () {
      this.hashtags = await fetchHashtags();
    },
  },
  created: function () {
    this.getHashtags();
  },
};
</script>
