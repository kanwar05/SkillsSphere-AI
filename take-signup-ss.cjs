const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  baseUrl: 'http://localhost:5174/register',
  screenshotDir: './screenshots',
  timeouts: {
    pageLoad: 2000,
    elementWait: 5000,
  },
  selectors: {
    form: ['form', '[data-testid="register-form"]', '#register-form'],
    submitButton: ['button[type="submit"]', 'text=Register', 'text=Sign Up', 'text=Create Account'],
    emailField: ['input[type="email"]', 'input[name="email"]', '[data-testid="email"]'],
    passwordField: ['input[type="password"]', 'input[name="password"]', '[data-testid="password"]'],
  },
};

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function waitForAny(page, selectors, timeout = 5000) {
  for (const sel of selectors) {
    try {
      await page.waitForSelector(sel, { timeout });
      return sel;
    } catch {
      continue;
    }
  }
  return null;
}

async function captureScreenshot(page, filename, label) {
  const filePath = path.join(CONFIG.screenshotDir, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`[screenshot] ${label} → ${filePath}`);
  return filePath;
}

(async () => {
  await ensureDir(CONFIG.screenshotDir);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();

    console.log('[nav] loading register page...');
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(CONFIG.timeouts.pageLoad);
    await captureScreenshot(page, 'signup-lobby.png', 'register page loaded');

    // --- Detect form elements ---
    const formSel = await waitForAny(page, CONFIG.selectors.form, CONFIG.timeouts.elementWait);
    if (formSel) {
      console.log(`[found] form: ${formSel}`);
    } else {
      console.warn('[warn] no form detected — check CONFIG.selectors.form');
    }

    const emailSel = await waitForAny(page, CONFIG.selectors.emailField, CONFIG.timeouts.elementWait);
    if (emailSel) {
      console.log(`[found] email field: ${emailSel}`);
      await page.fill(emailSel, 'test@example.com');
    }

    const passwordSel = await waitForAny(page, CONFIG.selectors.passwordField, CONFIG.timeouts.elementWait);
    if (passwordSel) {
      console.log(`[found] password field: ${passwordSel}`);
      await page.fill(passwordSel, 'Test@1234');
    }

    await captureScreenshot(page, 'signup-filled.png', 'form filled');

    // Log all buttons and testids for debugging
    const buttons = await page.$$eval('button', els => els.map(e => e.innerText.trim()));
    console.log('[debug] buttons on page:', buttons);

    const testIds = await page.$$eval('[data-testid]', els => els.map(e => e.dataset.testid));
    console.log('[debug] data-testid elements:', testIds);

  } catch (err) {
    console.error('[error]', err.message);
    process.exit(1);
  } finally {
    await browser.close();
    console.log('[done] browser closed');
  }
})();