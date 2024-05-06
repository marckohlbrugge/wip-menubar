const KeyCodes = {
  enter: 13,
  arrows: {
    left: 37,
    up: 38,
    right: 39,
    down: 40,
  },
};

const Mode = {
  Todo: 0,
  Hashtag: 1,
};

const DEFAULT_MODE = Mode.Todo;

module.exports = {
  KeyCodes,
  Mode,
  DEFAULT_MODE,
};
