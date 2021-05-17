const KEY_CODES = {
  enter: 13,
  arrows: {
    left: 37,
    up: 38,
    right: 39,
    down: 40,
  },
};

const STATE_ENUM = {
  Done: 0,
  Todo: 1,
  Help: 2,
};

const STATE_DATA = {
  [STATE_ENUM.Done]: {
    placeholder: 'Press return to complete todo…',
    icon: 'done',
  },
  [STATE_ENUM.Todo]: {
    placeholder: 'Press return to add pending todo…',
    icon: 'todo',
  },
  [STATE_ENUM.Help]: {
    placeholder: null,
    icon: 'life-ring',
  },
};

const DEFAULT_STATE_ENUM = STATE_ENUM.Done;
const DEFAULT_STATE = STATE_DATA[DEFAULT_STATE_ENUM];

module.exports = {
  KEY_CODES,
  STATE_ENUM,
  STATE_DATA,
  DEFAULT_STATE_ENUM,
  DEFAULT_STATE,
};
