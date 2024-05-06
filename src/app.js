try {
  require('electron-reloader')(module);
} catch (err) {
  console.warn('Failed to import electron', err.message);
}

const electron = require('electron');
// const AutoLaunch = require('auto-launch');
const { CronJob, CronTime } = require('cron');
const electronLocalshortcut = require('electron-localshortcut');
const icon = require('./icon');
const store = require('./store');
const pjson = require('../package.json');
const wip = require('./wip');
const debug = require('electron-debug');
const logger = require('./logger');
const { autoUpdater } = require('electron-updater');
const moment = require('moment-timezone');
const { NetChecker } = require('./onlinestatus/NetChecker');
const urls = require('./urls');
const crypto = require('crypto');
const fs = require('fs');
const { dialog } = require('electron');
const utils = require('./utils');

require('./ipc/main');

debug();

wip.setApiKey(store.get('oauth.access_token'));

global.syncInterval = 15; // in minutes

// Run this whenever app changes between dev / production mode
function initMode() {
  global.clientId = store.get('development')
    ? '2838c353e4d9b2ff6b35ba59e7a2051d43abbc43bc4cfdd263db5b88f6f75eb6'
    : '2838c353e4d9b2ff6b35ba59e7a2051d43abbc43bc4cfdd263db5b88f6f75eb6';
  wip.setDevMode(store.get('development'));
  wip.setClientId(global.clientId);

  global.oauthUrl = wip.getOAuthURL();
}

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

// app.setAsDefaultProtocolClient('wip');

app.on('ready', () => {
  logger.log('====== App ready ======');
  logger.log('Using access token:', store.get('oauth.access_token'));

  initMode();

  autoUpdater.checkForUpdatesAndNotify();

  // const autoLauncher = new AutoLaunch({ name: pjson.name });
  const tray = new Tray(icon.done);
  let oauthWindow = null;
  let composeWindow = null;
  let preferencesWindow = null;

  tray.setImage(icon.load);

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
          click: function () {
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
    logger.log('registerGlobalShortcut()');
    try {
      const ret = globalShortcut.register(store.get('shortcut'), () => {
        onComposeClick();
      });
      if (!ret) {
        logger.error('registration failed');
      }
    } catch (error) {
      // Probably invalid shortcut
      logger.error(error);
    }
  }

  function unregisterGlobalShortcut() {
    logger.log('unregisterGlobalShortcut()');
    try {
      globalShortcut.unregister(store.get('shortcut'));
    } catch (error) {
      // Probably invalid (previous) shortcut
      logger.error(error);
    }
  }

  registerGlobalShortcut();

  function createComposeWindow() {
    composeWindow = new BrowserWindow({
      width: 600,
      height: 54,
      frame: false,
      show: false,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      alwaysOnTop: true,
      webPreferences: {
        contextIsolation: true,
        preload: urls.getPreload(),
        sandbox: utils.isProduction,
      },
    });

    composeWindow.loadURL(urls.getPath('compose'));

    composeWindow.on('ready-to-show', () => {
      composeWindow.show();
      composeWindow.focus();
    });

    // Hide window when it loses focus
    composeWindow.on('blur', () => {
      if (composeWindow.webContents.isDevToolsFocused()) {
        // Ignore
      } else {
        composeWindow.hide();
      }
    });

    composeWindow.on('closed', () => {
      composeWindow = null;
    });

    electronLocalshortcut.register(composeWindow, 'Esc', () => {
      composeWindow.hide();
    });
  }

  function onComposeClick() {
    if (composeWindow === null) {
      return createComposeWindow();
    } else {
      composeWindow.show();
      composeWindow.focus();
    }
  }

  function showOAuthWindow() {
    if (oauthWindow === null) {
      return createOAuthWindow();
    } else {
      oauthWindow.focus();
    }
  }

  function createOAuthWindow() {
    logger.log('createOAuthWindow()');

    oauthWindow = new BrowserWindow({
      backgroundColor: '#000000',
      title: `${pjson.name} - OAuth`,
      width: 400,
      height: 280,
      frame: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      alwaysOnTop: true,
      show: true,
      webPreferences: {
        contextIsolation: true,
        preload: urls.getPreload(),
        sandbox: utils.isProduction,
      },
    });

    oauthWindow.loadURL(urls.getPath('oauth'));

    oauthWindow.on('ready-to-show', () => {
      oauthWindow.show();
      if (process.platform === 'darwin') {
        app.dock.show();
      }
    });

    oauthWindow.on('closed', () => {
      oauthWindow = null;
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
    });
  }

  function createPreferencesWindow() {
    preferencesWindow = new BrowserWindow({
      title: `${pjson.name} - Preferences`,
      width: 300,
      height: 370,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      show: false,
      webPreferences: {
        contextIsolation: true,
        preload: urls.getPreload(),
        sandbox: utils.isProduction,
      },
    });

    preferencesWindow.loadURL(urls.getPath('preferences'));

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

  function createTrayMenu(error = false) {
    let menuTemplate = new Array();

    if (error) {
      menuTemplate.push({ label: `Error: ${error}`, enabled: false });
    } else {
      const wipProfileUrl = `https://wip.co/@${store.get('viewer.username')}`;

      if (store.get('development')) {
        menuTemplate.push({ label: 'Development Mode', enabled: false });
      }

      menuTemplate = menuTemplate.concat([
        {
          label: store.get('viewer.username'),
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

      if (
        Array.isArray(store.get('viewer.projects')) &&
        store.get('viewer.projects').length
      ) {
        let submenu = new Array();

        store.get('viewer.projects').forEach(function (project) {
          submenu.push({
            label: project.name,
            click: () => shell.openExternal(project.url),
          });
        });

        menuTemplate.push({ label: 'Projects', submenu: submenu });
      }

      menuTemplate = menuTemplate.concat([
        { type: 'separator' },
        // {
        //   label: `Open Chat…`,
        //   click: () => shell.openExternal(`https://t.me/wipchat`),
        //   // click: () => shell.openExternal(`tg://resolve?domain=wipchat`),
        // },
        {
          label: `Open Questions…`,
          click: () => shell.openExternal(`https://wip.co/questions`),
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: requestViewerData,
        },
      ]);
    }

    menuTemplate.push(
      {
        label: 'Preferences...',
        accelerator: 'CmdOrCtrl+,',
        click: onPreferencesClick,
      },
      { type: 'separator' },
    );

    if (!error) {
      if (store.get('viewer.streaking')) {
        menuTemplate.push({ label: `You shipped today.`, enabled: false });
      } else {
        menuTemplate.push({
          label: `Time Left: ${timeLeft()}`,
          enabled: false,
        });
      }

      menuTemplate = menuTemplate.concat([
        {
          label: `Current Streak: ${store.get('viewer.currentStreak')}`,
          enabled: false,
        },
        {
          label: `Best Streak: ${store.get('viewer.bestStreak')}`,
          enabled: false,
        },
        { type: 'separator' },
      ]);
    }

    menuTemplate = menuTemplate.concat([
      {
        label: `Quit`,
        accelerator: 'CmdOrCtrl+Q',
        click: () => app.quit(),
      },
    ]);

    return Menu.buildFromTemplate(menuTemplate);
  }

  function reloadTray(error) {
    if (error) {
      tray.setContextMenu(createTrayMenu(error));
      tray.setImage(icon.fail);
    } else {
      tray.setImage(icon.load);
      tray.setContextMenu(createTrayMenu());
      tray.setImage(store.get('viewer.streaking') ? icon.done : icon.todo);
    }
  }

  function requestViewerData() {
    logger.log('requestViewerData()');
    return new Promise((resolve /*, _reject */) => {
      if (!store.get('oauth')) {
        logger.error('Aborting! No OAuth token present');
        return;
        // reject();
      }

      setTimeout(requestViewerData, 1000 * 60 * global.syncInterval);

      wip
        .viewer()
        .then((data) => {
          store.set('viewer', data);
          reloadTray();
          return resolve();
        })
        .catch((error) => {
          if (error == 'This endpoint requires a valid token') {
            logger.error('yay');
            resetOAuth();
          } else {
            logger.error('dasdasa');
          }
          // TODO: clear viewer data?
          reloadTray(error);
          // return reject();
          return resolve();
        });
    });
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

  async function setAuthorizationCode(event, authorization_code) {
    try {
      const oauth = await wip.getAccessToken(authorization_code);
      store.set('oauth', oauth);
      wip.setApiKey(store.get('oauth.access_token'));
      await requestViewerData();
      const data = {
        success: true,
        firstName: store.get('viewer.firstName'),
        shortcut: store.get('shortcut'),
      };
      event.sender.send('authorizationCodeSet', data);
    } catch (error) {
      const data = { succcess: false };
      event.sender.send('authorizationCodeSet', data);
    }
  }

  function timeLeft() {
    moment.tz.setDefault(store.get('viewer.time_zone'));

    var now = moment();
    var midnight = now.clone().endOf('day');

    const minutes = Math.abs(now.diff(midnight, 'minutes'));
    const hours = Math.abs(now.diff(midnight, 'hours'));

    let output = hours;
    output += hours % 24 == 1 ? ` hour` : ` hours`;
    output += `, ${minutes % 60}`;
    output += minutes % 60 == 1 ? ` minute` : ` minutes`;

    return output;
  }

  function activateLaunchAtLogin(event, isEnabled) {
    store.set('autoLaunch', isEnabled);
    // isEnabled ? autoLauncher.enable() : autoLauncher.disable();
    app.setLoginItemSettings({ openAtLogin: isEnabled });
    event.sender.send('activateLaunchAtLoginSet');
  }

  function activateDevelopmentMode(event, isEnabled) {
    store.set('development', isEnabled);

    // Reset all mode-dependent variables
    initMode();

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

  function setBroadcast(event, isEnabled) {
    store.set('broadcast', isEnabled);
  }

  async function attachmentsWithChecksums(attachments) {
    return await Promise.all(
      attachments.map(async (attachment) => {
        let data;

        if (attachment.file.path) {
          // Regular file
          data = fs.readFileSync(attachment.file.path);
        } else if (attachment.base64) {
          // Base64 file
          const base64Data = attachment.base64.split(',')[1];
          data = Buffer.from(base64Data, 'base64');
        }

        if (data) {
          // https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
          // The base64-encoded 128-bit MD5 digest of the message (without the headers) according to RFC 1864.
          const checksum = crypto
            .createHash('md5')
            .update(data)
            .digest('base64');
          attachment.file.checksum = checksum;
          attachment.file.data = data;
        }

        return attachment;
      }),
    );
  }

  async function createTodo(event, value, attachments) {
    attachments = await attachmentsWithChecksums(attachments);

    if (value.match(/^\/help\b/i)) {
      // Executing /help command
      shell.openExternal('https://wip.co/help#menubar');
      event.sender.send('todoSaved');
    } else {
      // Creating a todo
      value = value.replace(/^\/(todo|done)\b/i, '');
      var todo = wip.createTodo(value, attachments);
      event.sender.send('todoSaved');

      todo.then((result) => {
        logger.log('Todo saved: ', result.id);
        requestViewerData();
      });

      todo.catch((e) => {
        logger.error('Failed to save TODO', e.message);
        // Timeout required to allow renderer process to close todo window
        setTimeout(
          () =>
            dialog.showErrorBox(
              'Unexpected error',
              'Failed to save TODO. Try again later',
            ),
          100,
        );
      });
    }
  }

  async function onlineStatusChange(status) {
    logger.log('Network status changed', status);

    if (status === true) {
      requestViewerData();
    }
  }

  async function resize(event, height) {
    composeWindow.setSize(600, height);
  }

  async function resetOAuth() {
    logger.log('resetOAuth()');

    // Clear out store
    store.set('oauth', {});
    store.set('viewer', {});

    // Unset WIP API Key
    wip.setApiKey(null);

    // Reload menu
    reloadTray('Connect your account');

    // Ask for new OAuth
    showOAuthWindow();

    // Close Preferences Window
    if (preferencesWindow) preferencesWindow.close();
  }

  const job = new CronJob({
    cronTime: '0 */20 * * *',
    async onTick() {
      const data = await wip.viewer();
      if (!data.streaking && Notification.isSupported()) {
        new Notification({
          title: "Don't lose your WIP streak!",
          body: 'Make sure to complete a todo soon.',
          icon: 'build/icon1024.png',
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

  process.on('uncaughtException', (e) => {
    logger.error('Exception received:', e);
    tray.setContextMenu(createTrayMenu('Uncaught exception'));
    tray.setImage(icon.fail);
  });

  process.on('unhandledRejection', (e) => {
    logger.error('Unhandled rejection:', e);
  });

  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  app.on('window-all-closed', () => { });
  tray.on('right-click', requestViewerData);
  ipcMain.on('setAuthorizationCode', setAuthorizationCode);
  ipcMain.on('setShortcut', setShortcut);
  ipcMain.on('activateLaunchAtLogin', activateLaunchAtLogin);
  ipcMain.on('activateDevelopmentMode', activateDevelopmentMode);
  ipcMain.on('activateNotifications', activateNotifications);
  ipcMain.on('setNotificationTime', setNotificationTime);
  ipcMain.on('setBroadcast', setBroadcast);
  ipcMain.on('createTodo', createTodo);
  ipcMain.on('resetOAuth', resetOAuth);
  ipcMain.on('resize', resize);

  if (!store.get('oauth.access_token')) {
    // Ask user to connect
    showOAuthWindow();
  } else {
    // Load all data
    requestViewerData();
  }

  NetChecker.inst().on(NetChecker.EVENTS.changed, onlineStatusChange);
});
