const { EventEmitter } = require('events');
const logger = require('electron-log');
const isOnline = require('is-online');

class NetChecker extends EventEmitter {
  static EVENTS = { changed: 'changed' };
  static self = undefined;

  static inst() {
    if (NetChecker.self) return NetChecker.self;

    NetChecker.self = new NetChecker();
    return NetChecker.self;
  }

  // TODO: Move setStatus and setTimer to private methods in ts
  constructor() {
    super();
    this.status = undefined;

    const setStatus = st => {
      if (this.status === st) return;

      this.status = st;
      this.emit(NetChecker.EVENTS.changed, this.status);
    };

    const setTimer = async () => {
      try {
        const status = await isOnline({ timeout: 1000 });
        setStatus(status);
      } catch (e) {
        logger.warn('Failed to check online status', e);
        setStatus(false);
      } finally {
        this.timer = setTimeout(() => setTimer, 3000);
      }
    };

    setTimer();
  }
}

module.exports = {
  NetChecker,
};
