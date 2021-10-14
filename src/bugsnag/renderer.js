const Bugsnag = require('@bugsnag/js');
const BugsnagPluginVue = require('@bugsnag/plugin-vue');
const { API_KEY } = require('./config');

Bugsnag.start({
  apiKey: API_KEY,
  plugins: [new BugsnagPluginVue()],
});

module.exports = {
  bugsnag: Bugsnag,
};
