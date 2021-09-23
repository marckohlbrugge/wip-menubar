const isProduction = (function () {
  try {
    return IS_PRODUCTION;
  } catch (e) {
    return false;
  }
})();

const processType = (function () {
  try {
    return window === undefined ? 'main' : 'renderer';
  } catch {
    return 'main';
  }
})();

module.exports = {
  isProduction,
  processType,
};
