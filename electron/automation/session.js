const path = require('path');
const fs = require('fs');
const { app, dialog } = require('electron');

// In a packaged app, require playwright from the unpacked asar directory
function getChromium() {
  if (app.isPackaged) {
    const pw = require(path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'node_modules',
      'playwright'
    ));
    return pw.chromium;
  }
  return require('playwright').chromium;
}

const loginContexts = new Map();

function getProfileDir(platform) {
  const dir = path.join(app.getPath('userData'), 'profiles', platform);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function launchContext(platform, headless) {
  const chromium = getChromium();
  const profileDir = getProfileDir(platform);
  const opts = {
    headless,
    viewport: { width: 1280, height: 820 },
    args: ['--disable-blink-features=AutomationControlled'],
  };

  // Try Chrome → Edge → Playwright Chromium (requires npm run install-browsers)
  const channels = ['chrome', 'msedge', null];
  let lastErr;
  for (const channel of channels) {
    try {
      return await chromium.launchPersistentContext(
        profileDir,
        channel ? { ...opts, channel } : opts
      );
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    'ブラウザが見つかりません。Google Chrome をインストールするか、' +
    'コマンドプロンプトで npm run install-browsers を実行してください。\n\n' +
    lastErr.message
  );
}

async function openLoginBrowser(platform) {
  await closeLoginBrowser(platform);
  try {
    const context = await launchContext(platform, false);
    loginContexts.set(platform, context);
    const page = context.pages()[0] || await context.newPage();
    const url = platform === 'x' ? 'https://x.com/login' : 'https://www.threads.net/login';
    await page.goto(url);
    context.on('close', () => loginContexts.delete(platform));
    return { success: true };
  } catch (err) {
    dialog.showErrorBox('ブラウザ起動エラー', err.message);
    throw err;
  }
}

async function closeLoginBrowser(platform) {
  const existing = loginContexts.get(platform);
  if (existing) {
    try { await existing.close(); } catch {}
    loginContexts.delete(platform);
  }
  return { success: true };
}

async function checkLoginStatus(platform) {
  if (loginContexts.has(platform)) {
    return { loggedIn: null, busy: true };
  }
  let context;
  try {
    context = await launchContext(platform, true);
    const page = await context.newPage();
    if (platform === 'x') {
      await page.goto('https://x.com/home', { waitUntil: 'networkidle', timeout: 20000 });
      const loggedIn = await page.$('[data-testid="SideNav_NewTweet_Button"]') !== null;
      return { loggedIn };
    } else {
      await page.goto('https://www.threads.net', { waitUntil: 'networkidle', timeout: 20000 });
      const onLoginPage = await page.$('text=Log in with Instagram') !== null
        || page.url().includes('/login');
      return { loggedIn: !onLoginPage };
    }
  } catch (err) {
    return { loggedIn: false, error: err.message };
  } finally {
    if (context) try { await context.close(); } catch {}
  }
}

async function executePost(platform, contentArray) {
  if (loginContexts.has(platform)) {
    throw new Error(`${platform} のログインブラウザが開いています。閉じてから再試行してください。`);
  }
  const context = await launchContext(platform, true);
  try {
    if (platform === 'x') {
      const { postToX } = require('./twitter');
      await postToX(context, contentArray);
    } else {
      const { postToThreads } = require('./threads');
      await postToThreads(context, contentArray);
    }
  } finally {
    try { await context.close(); } catch {}
  }
}

module.exports = { openLoginBrowser, closeLoginBrowser, checkLoginStatus, executePost };
