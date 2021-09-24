require('./compose.css');

const { bugsnag } = require('../bugsnag/renderer');
const { ipcRenderer } = window.context.electron;
const { closeCurrent } = window.context.utils;
const Vue = require('vue/dist/vue.js');
const Buefy = require('buefy').default;
const App = require('./vue/App').default;

bugsnag.getPlugin('vue').installVueErrorHandler(Vue);
Vue.use(Buefy);

function resize() {
  let containerHeight = document.querySelector('.container').offsetHeight;
  let dropdownHeight = document.querySelector('.dropdown-menu').offsetHeight;

  let totalHeight = containerHeight + dropdownHeight;
  ipcRenderer.send('resize', totalHeight);
}

const app = new Vue({
  el: '#app',
  template: '<app></app>',
  components: { App },
  mounted: function () {
    ipcRenderer.on('todoSaved', closeCurrent);
    this.$nextTick(function () {
      const resizeObserver = new ResizeObserver(resize, { box: 'border-box' });
      resizeObserver.observe(document.querySelector('.dropdown-menu'));
      resizeObserver.observe(document.querySelector('.container'));

      resize();
    });
  },
  unmounted: function () {
    ipcRenderer.removeListener('todoSaved', closeCurrent);
  },
});
