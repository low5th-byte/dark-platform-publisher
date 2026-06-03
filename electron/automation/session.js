const { BrowserWindow } = require('electron');

const loginWindows = new Map();

function makeBrowser(platform, show) {
  return new BrowserWindow({
    width: 1280,
    height: 820,
    show,
    webPreferences: {
      partition: `persist:${platform}`,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
}

// Poll for a CSS selector; resolves when found or rejects on timeout
function waitForSelector(win, selector, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const tick = async () => {
      if (win.isDestroyed()) return reject(new Error('Window closed'));
      try {
        const found = await win.webContents.executeJavaScript(
          `!!document.querySelector(${JSON.stringify(selector)})`
        );
        if (found) return resolve();
      } catch {}
      if (Date.now() > deadline) return reject(new Error(`Timeout: ${selector}`));
      setTimeout(tick, 300);
    };
    tick();
  });
}

async function openLoginBrowser(platform) {
  closeLoginBrowser(platform);
  const win = makeBrowser(platform, true);
  loginWindows.set(platform, win);
  const url = platform === 'x' ? 'https://x.com/login' : 'https://www.threads.net/login';
  await win.loadURL(url);
  win.on('closed', () => loginWindows.delete(platform));
  return { success: true };
}

function closeLoginBrowser(platform) {
  const win = loginWindows.get(platform);
  if (win && !win.isDestroyed()) win.close();
  loginWindows.delete(platform);
  return { success: true };
}

async function checkLoginStatus(platform) {
  if (loginWindows.has(platform)) return { loggedIn: null, busy: true };

  const win = makeBrowser(platform, false);
  try {
    if (platform === 'x') {
      await win.loadURL('https://x.com/home');
      await new Promise(r => win.webContents.once('did-finish-load', r));
      await new Promise(r => setTimeout(r, 2000));
      const loggedIn = await win.webContents.executeJavaScript(
        `!!document.querySelector('[data-testid="SideNav_NewTweet_Button"]')`
      );
      return { loggedIn };
    } else {
      await win.loadURL('https://www.threads.net');
      await new Promise(r => win.webContents.once('did-finish-load', r));
      await new Promise(r => setTimeout(r, 2000));
      const url = win.webContents.getURL();
      return { loggedIn: !url.includes('/login') };
    }
  } catch (err) {
    return { loggedIn: false, error: err.message };
  } finally {
    if (!win.isDestroyed()) win.close();
  }
}

async function executePost(platform, contentArray) {
  if (loginWindows.has(platform)) {
    throw new Error(`${platform} のログインブラウザが開いています。閉じてから再試行してください。`);
  }
  const win = makeBrowser(platform, false);
  try {
    if (platform === 'x') {
      await postToX(win, contentArray);
    } else {
      await postToThreads(win, contentArray);
    }
  } finally {
    if (!win.isDestroyed()) win.close();
  }
}

async function postToX(win, contentArray) {
  await win.loadURL('https://x.com/home');
  await waitForSelector(win, '[data-testid="SideNav_NewTweet_Button"]');

  await win.webContents.executeJavaScript(
    `document.querySelector('[data-testid="SideNav_NewTweet_Button"]').click()`
  );
  await waitForSelector(win, '[data-testid="tweetTextarea_0"]');

  await win.webContents.executeJavaScript(
    `document.querySelector('[data-testid="tweetTextarea_0"]').focus()`
  );
  await win.webContents.insertText(contentArray[0]);

  for (let i = 1; i < contentArray.length; i++) {
    await waitForSelector(win, '[data-testid="addButton"]');
    await win.webContents.executeJavaScript(
      `document.querySelector('[data-testid="addButton"]').click()`
    );
    await waitForSelector(win, `[data-testid="tweetTextarea_${i}"]`);
    await win.webContents.executeJavaScript(
      `document.querySelector('[data-testid="tweetTextarea_${i}"]').focus()`
    );
    await win.webContents.insertText(contentArray[i]);
  }

  await win.webContents.executeJavaScript(`
    (document.querySelector('[data-testid="tweetButtonInline"]') ||
     document.querySelector('[data-testid="tweetButton"]')).click()
  `);
  await new Promise(r => setTimeout(r, 3000));
}

async function postToThreads(win, contentArray) {
  await win.loadURL('https://www.threads.net');
  await new Promise(r => win.webContents.once('did-finish-load', r));
  await new Promise(r => setTimeout(r, 2000));

  // Click compose button
  const clicked = await win.webContents.executeJavaScript(`
    (function() {
      const btn = document.querySelector('[aria-label="New thread"]') ||
                  document.querySelector('[aria-label="新しいスレッド"]');
      if (btn) { btn.click(); return true; }
      return false;
    })()
  `);
  if (!clicked) await win.loadURL('https://www.threads.net/compose');

  await waitForSelector(win, '[contenteditable="true"]');
  await win.webContents.executeJavaScript(
    `document.querySelector('[contenteditable="true"]').focus()`
  );
  await win.webContents.insertText(contentArray[0]);

  for (let i = 1; i < contentArray.length; i++) {
    await win.webContents.executeJavaScript(`
      (function() {
        const btn = document.querySelector('[aria-label="Add to thread"]') ||
                    [...document.querySelectorAll('button')].find(b => b.textContent.includes('Add'));
        if (btn) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));
    const inputs = await win.webContents.executeJavaScript(
      `document.querySelectorAll('[contenteditable="true"]').length`
    );
    if (inputs > i) {
      await win.webContents.executeJavaScript(
        `document.querySelectorAll('[contenteditable="true"]')[${i}].focus()`
      );
      await win.webContents.insertText(contentArray[i]);
    }
  }

  await win.webContents.executeJavaScript(`
    (function() {
      const btn = [...document.querySelectorAll('button')]
        .find(b => b.textContent.trim() === 'Post' || b.textContent.trim() === '投稿');
      if (btn) btn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 3000));
}

module.exports = { openLoginBrowser, closeLoginBrowser, checkLoginStatus, executePost };
