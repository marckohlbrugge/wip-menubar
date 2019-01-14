const electron = require('electron');
const AutoLaunch = require('auto-launch');
const { CronJob, CronTime } = require('cron');
const electronLocalshortcut = require('electron-localshortcut');

const icon = require('./icon');
const store = require('./store');
const pjson = require('../package.json');

const contribution = (username = '', options = {}) => {
  const { net } = require('electron');
  return new Promise((resolve, reject) => {
    let request_options = { method: 'POST', path: '/graphql' };

    if (store.get('development')) {
      request_options.protocol = 'http:';
      request_options.hostname = 'wip.test';
      request_options.port = 80;
    } else {
      request_options.protocol = 'https:';
      request_options.hostname = 'wip.chat';
      request_options.port = 443;
    }

    const request = net.request(request_options);
    request.setHeader('Content-Type', 'application/json');
    request.setHeader('Accept', 'application/json');

    let body = '';
    request.on('response', response => {
      if (response.statusCode !== 200) {
        if (options.onFailure) return options.onFailure(response);
        return reject(response);
      }

      response.on('data', chunk => {
        body += chunk.toString();
      });

      response.on('end', () => {
        const json = JSON.parse(body);
        const data = {
          completedCount: 123, // json.data.user.completed_todos_count,
          currentStreak: json.data.user.streak,
          bestStreak: json.data.user.best_streak,
          streaking: json.data.user.streaking,
          products: json.data.user.products,
        };
        if (options.onSuccess) return options.onSuccess(data);
        return resolve(data);
      });
    });
    const query = `
      {
        user(username:"${username}") {
          id
          first_name
          streak
          best_streak
          completed_todos_count
          streaking
          products {
            name
            url
          }
        }
      }
    `;
    request.end(JSON.stringify({ query: query }));
  });
};

const createTodoViaApi = (api_key = null, todo = null, options = {}) => {
  const { net } = require('electron');
  return new Promise((resolve, reject) => {
    let request_options = { method: 'POST', path: '/graphql' };

    if (store.get('development')) {
      request_options.protocol = 'http:';
      request_options.hostname = 'wip.test';
      request_options.port = 80;
    } else {
      request_options.protocol = 'https:';
      request_options.hostname = 'wip.chat';
      request_options.port = 443;
    }

    const request = net.request(request_options);
    request.setHeader('Content-Type', 'application/json');
    request.setHeader('Accept', 'application/json');
    request.setHeader('Authorization', `bearer ${api_key}`);

    let body = '';
    request.on('response', response => {
      if (response.statusCode !== 200) {
        console.log('create todo rjeect');
        if (options.onFailure) return options.onFailure(response);
        return reject(response);
      }

      response.on('data', chunk => {
        console.log('chunk of data');
        body += chunk.toString();
      });

      response.on('end', () => {
        console.log('create todo end');

        const json = JSON.parse(body);
        const data = {
          id: json.data.createTodo.id,
        };
        console.log(data);
        if (options.onSuccess) return options.onSuccess(data);
        return resolve(data);
      });
    });
    const completed_at = new Date().toISOString();
    const query = `
      mutation createTodo {
        createTodo(input: { body:"${todo}", completed_at:"${completed_at}" }) {
          id
          body
          completed_at
        }
      }
    `;
    request.end(JSON.stringify({ query: query }));
  });
};

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

  const ret = globalShortcut.register('Control+Space', () => {
    onComposeClick();
  })

  if (!ret) {
    console.log('registration failed')
  }

  function createComposeWindow() {
    composeWindow = new BrowserWindow({
      width: 600,
      height: 75,
      frame: false,
      show: false
    });
    composeWindow.loadURL(
      `file://${__dirname}/compose/compose.html`,
    );

    composeWindow.on('ready-to-show', () => {
      composeWindow.show();
      if (process.platform === 'darwin') {
        app.dock.show();
      }
    });

    composeWindow.on('closed', () => {
      composeWindow = null;
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
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
      height: 320,
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
    ]);

    if (!streaking) {
      menuTemplate.push({ label: `Time Left: ${timeLeft()}`, enabled: false });
    }

    menuTemplate = menuTemplate.concat([
      { label: `Current Streak: ${currentStreak}`, enabled: false },
      { label: `Best Streak: ${bestStreak}`, enabled: false },
      { type: 'separator' },
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
        click: requestContributionData,
      },
      {
        label: 'Preferences...',
        accelerator: 'CmdOrCtrl+,',
        click: onPreferencesClick,
      },
      { type: 'separator' },
      {
        label: `Quit`,
        accelerator: 'CmdOrCtrl+Q',
        click: () => app.quit(),
      },
    ]);

    return Menu.buildFromTemplate(menuTemplate);
  }

  function requestContributionData() {
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

    setTimeout(requestContributionData, 1000 * 60 * store.get('syncInterval'));

    contribution(username)
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
      requestContributionData();
      event.sender.send('usernameSet', !!username);
    } catch (error) {
      event.sender.send('usernameSet', false);
    }
  }

  async function setApiKey(event, api_key) {
    try {
      store.set('api-key', api_key);
      // TODO: here's a good time to load stuff
      // TODO: verify api key using API
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

    const minutes = Math.floor(timeDifference / 60000) % 60;
    const hours = Math.floor(minutes / 60) % 24;

    let output = `${hours} `;
    output += hours == 1 ? ` hour` : ` hours`;
    output += `, ${minutes}`
    output += minutes == 1 ? ` minute` : ` minutes`;

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
    var todo = createTodoViaApi(store.get('api-key'), value);

    todo.then(result => {
      console.log(result.id);
      event.sender.send('todoCreated', 'some todo');
    });

    todo.catch(() => {
      console.log('oops');
    });

  }

  const job = new CronJob({
    cronTime: '0 0 20 00 * *',
    async onTick() {
      const data = await contribution(store.get('username'));
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
  tray.on('right-click', requestContributionData);
  ipcMain.on('setUsername', setUsername);
  ipcMain.on('setApiKey', setApiKey);
  ipcMain.on('setSyncInterval', setSyncInterval);
  ipcMain.on('activateLaunchAtLogin', activateLaunchAtLogin);
  ipcMain.on('activateNotifications', activateNotifications);
  ipcMain.on('setNotificationTime', setNotificationTime);
  ipcMain.on('createTodo', createTodo);

  requestContributionData();

  if (!store.get('username')) {
    createPreferencesWindow();
  }
});
