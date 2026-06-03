async function postToThreads(context, contentArray) {
  const page = await context.newPage();
  try {
    await page.goto('https://www.threads.net', { waitUntil: 'networkidle', timeout: 30000 });

    // Open compose dialog — try common selectors for the compose button
    const composeSelectors = [
      '[aria-label="New thread"]',
      'a[href*="intent/post"]',
      '[data-testid="new-thread-button"]',
    ];

    let opened = false;
    for (const sel of composeSelectors) {
      try {
        await page.click(sel, { timeout: 5000 });
        opened = true;
        break;
      } catch {}
    }

    if (!opened) {
      // Navigate directly to the compose URL as a fallback
      await page.goto('https://www.threads.net/compose', { waitUntil: 'networkidle', timeout: 15000 });
    }

    // Wait for the text input to appear
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });

    // Fill the first post
    const firstInput = page.locator('[contenteditable="true"]').first();
    await firstInput.click();
    await page.keyboard.type(contentArray[0], { delay: 20 });

    // Add thread posts
    for (let i = 1; i < contentArray.length; i++) {
      // "Add to thread" button
      const addSelectors = [
        '[aria-label="Add to thread"]',
        'text=Add to thread',
        'button:has-text("Add")',
      ];
      let addClicked = false;
      for (const sel of addSelectors) {
        try {
          await page.click(sel, { timeout: 5000 });
          addClicked = true;
          break;
        } catch {}
      }
      if (!addClicked) throw new Error('スレッドへの追加ボタンが見つかりませんでした');

      // Wait for a new contenteditable to appear
      await page.waitForFunction(
        (count) => document.querySelectorAll('[contenteditable="true"]').length > count,
        i,
        { timeout: 5000 }
      );

      const nextInput = page.locator('[contenteditable="true"]').nth(i);
      await nextInput.click();
      await page.keyboard.type(contentArray[i], { delay: 20 });
    }

    // Submit
    await page.click('button:has-text("Post"), [data-testid="post-button"]', { timeout: 10000 });

    // Wait for the dialog to close as confirmation
    await page.waitForSelector('[contenteditable="true"]', { state: 'hidden', timeout: 15000 });
  } finally {
    await page.close();
  }
}

module.exports = { postToThreads };
