async function postToX(context, contentArray) {
  const page = await context.newPage();
  try {
    await page.goto('https://x.com/home', { waitUntil: 'networkidle', timeout: 30000 });

    // Verify we're logged in
    const composeBtn = await page.waitForSelector('[data-testid="SideNav_NewTweet_Button"]', { timeout: 15000 });
    await composeBtn.click();

    // Wait for the compose dialog
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });

    // Fill the first post
    await fillTweetBox(page, 0, contentArray[0]);

    // Add thread posts
    for (let i = 1; i < contentArray.length; i++) {
      const addBtn = await page.waitForSelector('[data-testid="addButton"]', { timeout: 5000 });
      await addBtn.click();
      await page.waitForSelector(`[data-testid="tweetTextarea_${i}"]`, { timeout: 5000 });
      await fillTweetBox(page, i, contentArray[i]);
    }

    // Click the Post / Tweet button
    const postBtn = await page.waitForSelector(
      '[data-testid="tweetButtonInline"], [data-testid="tweetButton"]',
      { timeout: 10000 }
    );
    await postBtn.click();

    // Wait for the compose dialog to close as confirmation
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', { state: 'hidden', timeout: 15000 });
  } finally {
    await page.close();
  }
}

async function fillTweetBox(page, index, text) {
  const selector = `[data-testid="tweetTextarea_${index}"]`;
  const el = await page.waitForSelector(selector, { timeout: 5000 });
  await el.click();
  // Use keyboard typing to trigger React synthetic events reliably
  await page.keyboard.type(text, { delay: 20 });
}

module.exports = { postToX };
