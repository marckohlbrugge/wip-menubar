const { app } = require('electron');

const isProduction = global.IS_PRODUCTION || false;
const basePath = (() => {
  return isProduction ? `file:///${app.getAppPath()}` : 'http://localhost:8080';
})();

function getPath(page) {
  return `${basePath}/${page}.html`;
}

module.exports = {
  getPath,
};
