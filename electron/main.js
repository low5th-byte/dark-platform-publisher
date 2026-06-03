const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 940,
    height: 700,
    minWidth: 720,
    minHeight: 540,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0d0d0d',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  const { initStore } = require('./store');
  const { rescheduleAll } = require('./scheduler');

  await initStore();
  createWindow();
  await rescheduleAll();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Posts
ipcMain.handle('posts:get', () => {
  const { getPosts } = require('./store');
  return getPosts();
});

ipcMain.handle('posts:schedule', async (_, postData) => {
  const { addPost } = require('./store');
  const { schedulePost } = require('./scheduler');
  const post = await addPost(postData);
  schedulePost(post);
  return post;
});

ipcMain.handle('posts:cancel', async (_, id) => {
  const { cancelPost } = require('./store');
  const { cancelScheduledPost } = require('./scheduler');
  cancelScheduledPost(id);
  return cancelPost(id);
});

// Auth
ipcMain.handle('auth:login', async (_, platform) => {
  const { openLoginBrowser } = require('./automation/session');
  return openLoginBrowser(platform);
});

ipcMain.handle('auth:login-close', async (_, platform) => {
  const { closeLoginBrowser } = require('./automation/session');
  return closeLoginBrowser(platform);
});

ipcMain.handle('auth:status', async (_, platform) => {
  const { checkLoginStatus } = require('./automation/session');
  return checkLoginStatus(platform);
});

function notifyRenderer(post) {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0 && !windows[0].isDestroyed()) {
    windows[0].webContents.send('post:updated', post);
  }
}

module.exports = { notifyRenderer };
