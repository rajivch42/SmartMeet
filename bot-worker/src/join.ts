import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { SELECTORS } from './selectors';

export interface JoinMeetingOptions {
  meetingUrl: string;
  botName?: string;
  headless?: boolean;
  admitTimeoutMinutes?: number;
}

export interface JoinMeetingResult {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export async function joinMeeting({
  meetingUrl,
  botName = 'My Own Bot',
  headless = true,
  admitTimeoutMinutes = 10,
}: JoinMeetingOptions): Promise<JoinMeetingResult> {
  console.log(`[JOIN] Launching Chromium (headless: ${headless}) for ${meetingUrl}...`);

  const browser = await chromium.launch({
    headless,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext({
    permissions: ['camera', 'microphone'],
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
  });

  // Anti-bot stealth evasions: remove navigator.webdriver and mock chrome object
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    (window as any).chrome = {
      runtime: {},
      loadTimes: function () {},
      csi: function () {},
      app: {},
    };
  });

  const page = await context.newPage();

  console.log(`[JOIN] Navigating to Google Meet: ${meetingUrl}...`);
  await page.goto(meetingUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 1. Wait for Google Meet Lobby to render (up to 15 seconds)
  console.log('[JOIN] Waiting for Google Meet lobby UI to load...');
  let nameFilled = false;
  const lobbyStart = Date.now();

  while (Date.now() - lobbyStart < 15000) {
    if (page.isClosed()) throw new Error('Browser closed during lobby wait.');

    // Check if Google Meet already rejected on landing (e.g. meeting ended or sign-in required)
    try {
      const returnHomeBtn = await page.$('button:has-text("Return to home screen"), a:has-text("Return to home screen")');
      if (returnHomeBtn && (await returnHomeBtn.isVisible())) {
        const msg = (await page.innerText('body').catch(() => '')).split('\n').map(s => s.trim()).filter(Boolean).join(' | ');
        console.log(`[JOIN] Google Meet blocked access on landing: "${msg}"`);
        throw new Error(`Google Meet blocked access: ${msg.slice(0, 200)}`);
      }
    } catch (err: any) {
      if (err.message.includes('Google Meet blocked access')) throw err;
    }

    // Dismiss any introductory popups ("Got it", "Dismiss")
    try {
      const dismissBtn = await page.$('button:has-text("Got it"), button:has-text("Dismiss")');
      if (dismissBtn && (await dismissBtn.isVisible())) {
        await dismissBtn.click();
      }
    } catch {}

    // Check for Name input field
    for (const selector of SELECTORS.nameInput) {
      try {
        const input = await page.$(selector);
        if (input && (await input.isVisible())) {
          await input.click();
          await input.fill('');
          await input.fill(botName);
          console.log(`[JOIN] Entered bot name "${botName}" using selector: ${selector}`);
          nameFilled = true;
          break;
        }
      } catch {}
    }

    if (nameFilled) break;

    // If join button is already visible (user already has display name or signed in)
    const joinBtn = await page.$('button:has-text("Ask to join"), button:has-text("Join now")');
    if (joinBtn && (await joinBtn.isVisible())) {
      console.log('[JOIN] Join button already visible without name prompt.');
      break;
    }

    await page.waitForTimeout(1000);
  }

  // 2. Mute Microphone & Camera
  try {
    await page.keyboard.press('Control+d');
    await page.keyboard.press('Control+e');
  } catch {}

  for (const selector of SELECTORS.micToggle) {
    try {
      const btn = await page.$(selector);
      if (btn && (await btn.isVisible())) {
        await btn.click();
        console.log(`[JOIN] Clicked mute microphone.`);
        break;
      }
    } catch {}
  }

  for (const selector of SELECTORS.cameraToggle) {
    try {
      const btn = await page.$(selector);
      if (btn && (await btn.isVisible())) {
        await btn.click();
        console.log(`[JOIN] Clicked turn off camera.`);
        break;
      }
    } catch {}
  }

  await page.waitForTimeout(1000);

  // 3. Click "Ask to join" / "Join now"
  let joinClicked = false;
  const joinStart = Date.now();
  while (Date.now() - joinStart < 12000) {
    if (page.isClosed()) throw new Error('Browser closed before join clicked.');

    for (const selector of SELECTORS.askToJoinButton) {
      try {
        const btn = await page.$(selector);
        if (btn && (await btn.isVisible())) {
          await btn.click();
          console.log(`[JOIN] Clicked join button: ${selector}`);
          joinClicked = true;
          break;
        }
      } catch {}
    }

    if (joinClicked) break;
    await page.waitForTimeout(1000);
  }

  if (!joinClicked) {
    console.warn('[JOIN] Join button not clicked; checking if already knocking or in call...');
  }

  // 4. Waiting Room & Admission Polling Loop
  console.log(`[JOIN] Knocked. Waiting for host admission (Timeout: ${admitTimeoutMinutes} min)...`);
  const startTime = Date.now();
  const maxWaitMs = admitTimeoutMinutes * 60 * 1000;

  while (Date.now() - startTime < maxWaitMs) {
    if (page.isClosed()) {
      throw new Error('Browser window was closed.');
    }

    // Check if admitted (in-call UI exists)
    for (const marker of SELECTORS.inCallMarkers) {
      try {
        const el = await page.$(marker);
        if (el && (await el.isVisible())) {
          console.log(`[JOIN] Admission confirmed! Bot is inside Google Meet call. (Marker: ${marker})`);
          return { browser, context, page };
        }
      } catch {}
    }

    // Check if denied or ejected
    for (const deniedMarker of SELECTORS.deniedMarkers) {
      try {
        const el = await page.$(deniedMarker);
        if (el && (await el.isVisible())) {
          const bodyText = (await page.innerText('body').catch(() => ''))
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
            .join(' | ');
          console.log(`[JOIN] Google Meet screen message: "${bodyText}"`);
          throw new Error(`Google Meet message: ${bodyText.slice(0, 200)}`);
        }
      } catch (err: any) {
        if (err.message.includes('Google Meet message')) throw err;
      }
    }

    await page.waitForTimeout(2000);
  }

  throw new Error(`Admission timed out after ${admitTimeoutMinutes} minutes.`);
}
