<template>
  <ul class="attachments">
    <li
      v-for="(attachment, index) in attachments"
      class="attachment"
      :key="index"
      @click="removeAttachment(index)"
    >
      <div>{{ attachment.file.name }}</div>
      <div class="close"></div>
    </li>
  </ul>
</template>

<script>
const Vue = require('vue/dist/vue.js');

export default {
  data: function () {
    return {
      attachments: [],
    };
  },
  methods: {
    addAttachment: function (file, file_name = null) {
      if (file_name) {
        file_name = [file_name, file.name.split('.').pop()].join('.');
      }

      const file_copy = {
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
        const reader = new FileReader();
        reader.onload = () => {
          this.attachments.push({
            file: file_copy,
            base64: reader.result,
          });
        };
        reader.readAsDataURL(file);
      }
    },

    removeAttachment: function (index) {
      this.attachments.splice(index, 1);
    },

    getAttachments: function () {
      return this.attachments;
    },
  },
};
</script>