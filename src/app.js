try {
  require('electron-reloader')(module);
} catch (err) {}

const electron = require('electron');
const AutoLaunch = require('auto-launch');
const { CronJob, CronTime } = require('cron');
const electronLocalshortcut = require('electron-localshortcut');
const icon = require('./icon');
const store = require('./store');
const pjson = require('../package.json');
const wip = require('./wip');
const debug = require('electron-debug');
const ipc = require('electron-better-ipc');

debug();

wip.setDevMode(store.get('development'));
wip.setApiKey(store.get('api-key'));

const {
  app,
  globalShortcut,
  BrowserWindow,
  ipcMain,
  Menu,
  Notification,
  shell,
  Tray,
} = electron;

app.on('ready', () => {
  const autoLauncher = new AutoLaunch({ name: pjson.name });
  const tray = new Tray(icon.done);
  let composeWindow = null;
  let preferencesWindow = null;

  // Create the Application's main menu
  var template = [
    {
      label: 'Application',
      submenu: [
        {
          label: 'About Application',
          selector: 'orderFrontStandardAboutPanel:',
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: function() {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          selector: 'selectAll:',
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  function registerGlobalShortcut() {
    try {
      const ret = globalShortcut.register(store.get('shortcut'), () => {
        onComposeClick();
      });
      if (!ret) {
        console.log('registration failed');
      }
    } catch (error) {
      // Probably invalid shortcut
      console.log(error);
    }
  }

  function unregisterGlobalShortcut() {
    try {
      globalShortcut.unregister(store.get('shortcut'));
    } catch (error) {
      // Probably invalid (previous) shortcut
      console.log(error);
    }
  }

  registerGlobalShortcut();

  function createComposeWindow() {
    composeWindow = new BrowserWindow({
      width: 600,
      height: 200,
      frame: false,
      show: false,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      transparent: true,
      alwaysOnTop: true,
      webPreferences: {
        devTools: true,
      },
    });

    composeWindow.loadURL(`file://${__dirname}/compose/compose.html`);

    composeWindow.on('ready-to-show', () => {
      composeWindow.show();
    });

    // Hide window when it loses focus
    // composeWindow.on('blur', event => {
    //   composeWindow.close();
    // });

    composeWindow.on('closed', () => {
      composeWindow = null;
    });

    electronLocalshortcut.register(composeWindow, 'Esc', () => {
      composeWindow.close();
    });
  }

  function onComposeClick() {
    if (composeWindow === null) {
      return createComposeWindow();
    }
    composeWindow.focus();
  }

  function createPreferencesWindow() {
    preferencesWindow = new BrowserWindow({
      title: `${pjson.name} - Preferences`,
      width: 300,
      height: 585,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      show: false,
    });

    preferencesWindow.loadURL(
      `file://${__dirname}/preferences/preferences.html`,
    );

    preferencesWindow.on('ready-to-show', () => {
      preferencesWindow.show();
      if (process.platform === 'darwin') {
        app.dock.show();
      }
    });

    preferencesWindow.on('closed', () => {
      preferencesWindow = null;
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
    });
  }

  function onPreferencesClick() {
    if (preferencesWindow === null) {
      return createPreferencesWindow();
    }
    preferencesWindow.focus();
  }

  function createTrayMenu(
    completedCount,
    currentStreak,
    bestStreak,
    products,
    streaking,
  ) {
    const username = store.get('username') || 'Username not set';
    const wipProfileUrl = `https://wip.chat/@${username}`;

    let menuTemplate = new Array();

    if (store.get('development')) {
      menuTemplate.push({ label: 'Development Mode', enabled: false });
    }

    menuTemplate = menuTemplate.concat([
      {
        label: username,
        click: () => shell.openExternal(wipProfileUrl),
        accelerator: 'CmdOrCtrl+O',
      },
      { type: 'separator' },
      {
        label: 'New Todo...',
        accelerator: store.get('shortcut'),
        click: onComposeClick,
      },
    ]);

    if (Array.isArray(products)) {
      let submenu = new Array();

      products.forEach(function(product) {
        submenu.push({
          label: product.name,
          click: () => shell.openExternal(product.url),
        });
      });

      menuTemplate.push({ label: 'Products', submenu: submenu });
    }

    menuTemplate = menuTemplate.concat([
      { type: 'separator' },
      {
        label: `Open Chat…`,
        click: () => shell.openExternal(`tg://resolve?domain=wipchat`),
      },
      {
        label: `Open Questions…`,
        click: () => shell.openExternal(`https://wip.chat/questions`),
      },
      { type: 'separator' },
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: requestViewerData,
      },
      {
        label: 'Preferences...',
        accelerator: 'CmdOrCtrl+,',
        click: onPreferencesClick,
      },
      { type: 'separator' },
    ]);

    if (streaking) {
      menuTemplate.push({ label: `You shipped today.`, enabled: false });
    } else {
      menuTemplate.push({ label: `Time Left: ${timeLeft()}`, enabled: false });
    }

    menuTemplate = menuTemplate.concat([
      { label: `Current Streak: ${currentStreak}`, enabled: false },
      { label: `Best Streak: ${bestStreak}`, enabled: false },
      { type: 'separator' },
    ]);

    menuTemplate = menuTemplate.concat([
      {
        label: `Quit`,
        accelerator: 'CmdOrCtrl+Q',
        click: () => app.quit(),
      },
    ]);

    return Menu.buildFromTemplate(menuTemplate);
  }

  function requestViewerData() {
    const username = store.get('username');
    if (!username) {
      tray.setImage(icon.fail);
      tray.setContextMenu(createTrayMenu(0, 0, 0, 0));
      return;
    }

    tray.setImage(icon.load);
    tray.setContextMenu(
      createTrayMenu('Loading...', 'Loading...', 'Loading...', 'Loading...'),
    );

    setTimeout(requestViewerData, 1000 * 60 * store.get('syncInterval'));

    wip.viewer()
      .then(data => {
        tray.setContextMenu(
          createTrayMenu(
            data.completedTodos,
            data.currentStreak,
            data.bestStreak,
            data.products,
            data.streaking,
          ),
        );
        tray.setImage(data.streaking ? icon.done : icon.todo);
      })
      .catch(() => {
        tray.setContextMenu(createTrayMenu('Error', 'Error', 'Error', 'Error'));
        tray.setImage(icon.fail);
      });
  }

  async function setUsername(event, username) {
    try {
      store.set('username', username);
      requestViewerData();
      event.sender.send('usernameSet', !!username);
    } catch (error) {
      event.sender.send('usernameSet', false);
    }
  }

  // Unregisters current shortcut, sets shortcut variable to new choice, and
  // finally registers the new shortcut.
  //
  // TODO: Verify shortcut is valid format
  async function setShortcut(event, shortcut) {
    unregisterGlobalShortcut();
    store.set('shortcut', shortcut);
    registerGlobalShortcut();
  }

  ipc.answerRenderer('fetchPendingTodos', async filter => {
    return await wip.pendingTodos(filter);
  });

  // Stores API Key in config.
  //
  // TODO: Verify key using API
  async function setApiKey(event, api_key) {
    try {
      store.set('api-key', api_key);
      wip.apiKey = store.get('api-key');
      requestViewerData();
      event.sender.send('apiKeySet', !!api_key);
    } catch (error) {
      event.sender.send('apiKeySet', false);
    }
  }

  function timeLeft() {
    const now = new Date();

    let midnight = new Date(now.valueOf());
    midnight.setHours(24);
    midnight.setMinutes(0 - now.getTimezoneOffset());
    midnight.setSeconds(0);
    midnight.setMilliseconds(0);

    const timeDifference = midnight.getTime() - now.getTime();

    const minutes = Math.floor(timeDifference / 60000);
    const hours = Math.floor(minutes / 60);

    let output = `${hours % 24}`;
    output += hours % 24 == 1 ? ` hour` : ` hours`;
    output += `, ${minutes % 60}`;
    output += minutes % 60 == 1 ? ` minute` : ` minutes`;

    return output;
  }

  function setSyncInterval(event, interval) {
    store.set('syncInterval', interval);
    event.sender.send('syncIntervalSet');
  }

  function activateLaunchAtLogin(event, isEnabled) {
    store.set('autoLaunch', isEnabled);
    isEnabled ? autoLauncher.enable() : autoLauncher.disable();
    event.sender.send('activateLaunchAtLoginSet');
  }

  function activateDevelopmentMode(event, isEnabled) {
    store.set('development', isEnabled);

    // Set WIP dev mode
    wip.devMode = isEnabled;

    // Reload menubar
    requestViewerData();

    event.sender.send('activateDevelopmentModeSet');
  }

  function activateNotifications(event, isEnabled) {
    store.set('notification.isEnabled', isEnabled);
    if (isEnabled) {
      const time = store.get('notification.time');
      const timeArray = time.split(':');
      const cronTime = `0 ${timeArray[1]} ${timeArray[0]} * * *`;
      job.setTime(new CronTime(cronTime));
      job.start();
    } else {
      job.stop();
    }
    event.sender.send('activateNotificationsSet');
  }

  function setNotificationTime(event, time) {
    store.set('notification.time', time);
    const timeArray = time.split(':');
    const cronTime = `0 ${timeArray[1]} ${timeArray[0]} * * *`;
    job.setTime(new CronTime(cronTime));
    job.start();
    event.sender.send('NotificationTimeSet');
  }

  async function createTodo(event, value) {
    const completed = !value.match(/^\/todo\b/i);
    value = value.replace(/^\/(todo|done)\b/i, '');
    var todo = wip.createTodo(value, completed);

    todo.then(result => {
      console.log(result.id);
      event.sender.send('todoSaved', result);
    });

    todo.catch(() => {
      console.log('oops');
    });
  }

  async function completeTodo(event, todo_id) {
    var todo = wip.completeTodo(todo_id);

    todo.then(result => {
      console.log(result.id);
      event.sender.send('todoSaved', result);
    });

    todo.catch(() => {
      console.log('oops');
    });
  }

  const job = new CronJob({
    cronTime: '0 0 20 00 * *',
    async onTick() {
      const data = await wip.viewer();
      if (!data.streaking && Notification.isSupported()) {
        new Notification({
          title: pjson.name,
          body: "You haven't yet shipped today",
        }).show();
      }
    },
  });

  if (store.get('notification.isEnabled')) {
    const time = store.get('notification.time');
    const timeArray = time.split(':');
    const cronTime = `0 ${timeArray[1]} ${timeArray[0]} * * *`;
    job.setTime(new CronTime(cronTime));
    job.start();
  }

  process.on('uncaughtException', () => {
    tray.setContextMenu(createTrayMenu('Error', 'Error', 'Error', 'Error'));
    tray.setImage(icon.fail);
  });

  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  app.on('window-all-closed', () => {});
  tray.on('right-click', requestViewerData);
  ipcMain.on('setUsername', setUsername);
  ipcMain.on('setApiKey', setApiKey);
  ipcMain.on('setShortcut', setShortcut);
  ipcMain.on('setSyncInterval', setSyncInterval);
  ipcMain.on('activateLaunchAtLogin', activateLaunchAtLogin);
  ipcMain.on('activateDevelopmentMode', activateDevelopmentMode);
  ipcMain.on('activateNotifications', activateNotifications);
  ipcMain.on('setNotificationTime', setNotificationTime);
  ipcMain.on('createTodo', createTodo);
  ipcMain.on('completeTodo', completeTodo);

  requestViewerData();

  if (!store.get('api-key')) {
    createPreferencesWindow();
  }
});
