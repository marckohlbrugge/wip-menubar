const Bugsnag = require('@bugsnag/electron');
const { API_KEY } = require('./config');

Bugsnag.start({
  apiKey: API_KEY,
});

module.exports = {
  bugsnag: Bugsnag,
};
