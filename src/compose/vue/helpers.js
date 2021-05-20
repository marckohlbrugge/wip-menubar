const KeyCodes = {
  enter: 13,
  arrows: {
    left: 37,
    up: 38,
    right: 39,
    down: 40,
  },
};

const TodoState = {
  Done: 0,
  Todo: 1,
  Help: 2,
};

const TodoDesc = {
  [TodoState.Done]: {
    placeholder: 'Press return to complete todo…',
    icon: 'done',
  },
  [TodoState.Todo]: {
    placeholder: 'Press return to add pending todo…',
    icon: 'todo',
  },
  [TodoState.Help]: {
    placeholder: null,
    icon: 'life-ring',
  },
};

const Mode = {
  Todo: 0,
  Hashtag: 1,
};

const DEFAULT_TODO_STATE = TodoState.Done;
const DEFAULT_TODO_DATA = TodoDesc[DEFAULT_TODO_STATE];
const DEFAULT_MODE = Mode.Todo;

module.exports = {
  KeyCodes,
  TodoState,
  TodoDesc,
  Mode,
  DEFAULT_TODO_STATE,
  DEFAULT_TODO_DATA,
  DEFAULT_MODE,
};
