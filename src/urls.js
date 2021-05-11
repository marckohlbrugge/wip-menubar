const { app } = require('electron');

const isProduction = (function() {
  try {
    return IS_PRODUCTION;
  } catch (e) {
    return false;
  }
})();

const basePath = (() => {
  return isProduction
    ? `file:///${app.getAppPath()}/dist`
    : 'http://localhost:8080';
})();

function getPath(page) {
  return `${basePath}/${page}.html`;
}

function getPreload() {
  return isProduction
    ? `${app.getAppPath()}/dist/electron-preload.js`
    : `${__dirname}/preload.js`;
}

module.exports = {
  getPath,
  getPreload,
};
