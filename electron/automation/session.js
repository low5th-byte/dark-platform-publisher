const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Track open login browser contexts to avoid profile lock conflicts
const loginContexts = new Map();

function getProfileDir(platform) {
  const dir = path.join(app.getPath('userData'), 'profiles', platform);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function launchContext(platform, headless) {
  const profileDir = getProfileDir(platform);
  const opts = {
    headless,
    viewport: { width: 1280, height: 820 },
    args: ['--disable-blink-features=AutomationControlled'],
  };

  // Prefer system Chrome; fall back to Playwright's bundled Chromium
  try {
    return await chromium.launchPersistentContext(profileDir, { ...opts, channel: 'chrome' });
  } catch {
    try {
      return await chromium.launchPersistentContext(profileDir, { ...opts, channel: 'msedge' });
    } catch {
      return await chromium.launchPersistentContext(profileDir, opts);
    }
  }
}

async function openLoginBrowser(platform) {
  // Close any existing login context for this platform first
  await closeLoginBrowser(platform);

  const context = await launchContext(platform, false);
  loginContexts.set(platform, context);

  const page = context.pages()[0] || await context.newPage();
  const url = platform === 'x' ? 'https://x.com/login' : 'https://www.threads.net/login';
  await page.goto(url);

  // Clean up when the user closes the browser
  context.on('close', () => loginContexts.delete(platform));

  return { success: true };
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
  // Can't check while login browser is open (same profile dir = Chrome lock)
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
      // Logged-in Threads shows the home feed or compose button, not the login page
      const loginPage = await page.$('text=Log in with Instagram') !== null
        || page.url().includes('/login');
      return { loggedIn: !loginPage };
    }
  } catch (err) {
    return { loggedIn: false, error: err.message };
  } finally {
    if (context) {
      try { await context.close(); } catch {}
    }
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
