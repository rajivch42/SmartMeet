import { Page } from 'playwright';
import { CaptionMerger } from './merge';
import { SELECTORS } from './selectors';

/**
 * Turns on closed captions in Google Meet and injects the MutationObserver.
 */
export async function setupCaptions(page: Page, merger: CaptionMerger): Promise<boolean> {
  console.log('[CAPTIONS] Enabling closed captions in Google Meet...');

  // Expose bridge function from Node to Browser DOM
  await page.exposeFunction('onMeetCaptionChunk', (speaker: string, text: string) => {
    merger.pushUpdate(speaker, text);
  });

  // Try keyboard shortcut 'c' (Google Meet standard hotkey for captions)
  try {
    await page.keyboard.press('c');
    await page.waitForTimeout(1000);
  } catch (err) {
    console.warn('[CAPTIONS] Hotkey press warning:', err);
  }

  // Fallback: Click caption button if still not active
  for (const selector of SELECTORS.captionButton) {
    try {
      const btn = await page.$(selector);
      if (btn) {
        await btn.click();
        console.log(`[CAPTIONS] Clicked caption button using selector: ${selector}`);
        break;
      }
    } catch {
      // Continue to next selector
    }
  }

  // Inject MutationObserver into the page context
  await page.evaluate(() => {
    console.log('[BROWSER_DOM] Initializing caption MutationObserver...');

    const findCaptionContainer = (): Element | null => {
      // Known Google Meet caption container classes and aria roles
      return (
        document.querySelector('div[aria-live="polite"]') ||
        document.querySelector('div[jsname="YSvy7"]') ||
        document.querySelector('div.nMxBNf') ||
        document.body
      );
    };

    const targetNode = findCaptionContainer() || document.body;

    const observer = new MutationObserver(() => {
      // Look for caption blocks
      // In Google Meet, captions are structured as blocks with speaker name and text spans
      const captionBlocks = document.querySelectorAll(
        'div[aria-live="polite"] > div, div.nMxBNf, div[jsname="YSvy7"]'
      );

      captionBlocks.forEach((block) => {
        // Find speaker label (usually in an img alt, or div with class zs7LEd / jT30ne)
        let speaker = '';
        const img = block.querySelector('img[alt]');
        if (img) {
          speaker = img.getAttribute('alt') || '';
        }

        if (!speaker) {
          const speakerEl =
            block.querySelector('div.zs7LEd') ||
            block.querySelector('span.jT30ne') ||
            block.querySelector('[data-sender-name]');
          if (speakerEl) {
            speaker = speakerEl.textContent?.trim() || '';
          }
        }

        // Find text content
        const textEl =
          block.querySelector('div.iTTPOb') ||
          block.querySelector('span[jsname]') ||
          block;

        const text = textEl.textContent?.trim() || '';

        // If we found valid text
        if (text && text.length > 0) {
          // Clean up speaker name if prepended
          let cleanText = text;
          if (speaker && cleanText.startsWith(speaker)) {
            cleanText = cleanText.substring(speaker.length).replace(/^[:\s-]+/, '').trim();
          }

          if (cleanText.length > 0) {
            // @ts-ignore
            window.onMeetCaptionChunk(speaker || 'Participant', cleanText);
          }
        }
      });
    });

    observer.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    console.log('[BROWSER_DOM] Caption MutationObserver active on targetNode.');
  });

  return true;
}
