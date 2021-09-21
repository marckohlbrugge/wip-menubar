const { EventEmitter } = require('events');
const logger = require('../logger');
const isOnline = require('is-online');

class NetChecker extends EventEmitter {
  static EVENTS = { changed: 'changed' };
  static self = undefined;

  static inst() {
    if (NetChecker.self) return NetChecker.self;

    NetChecker.self = new NetChecker();
    return NetChecker.self;
  }

  // Private

  constructor() {
    super();
    this.status = undefined;

    const setStatus = status => {
      if (this.status === status) return;

      this.status = status;
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
        this.timer = setTimeout(() => setTimer(), 3000);
      }
    };

    setTimer();
  }
}

module.exports = {
  NetChecker,
};
