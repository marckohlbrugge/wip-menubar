const logger = require('electron-log');
const { processType } = require('./utils');

const isRenderer = processType === 'renderer';

function getWindowLabel() {
  if (!isRenderer) return 'wip_main';

  const path = window.location.pathname;

  const last = path.lastIndexOf('/');
  if (last < 0) return path;

  return path.substring(last + 1);
}

function init() {
  logger.transports.file.maxSize = 5 * 1024 * 1024;
  logger.transports.file.level = 'verbose';
  logger.transports.file.sync = false;
  logger.transports.file.fileName = 'app.log';

  logger.variables.label = getWindowLabel();
  logger.transports.file.format =
    '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{label}] [{level}]{scope} {text}';
}

// if (isProduction === true) init();
init();

module.exports = logger;
