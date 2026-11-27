import { Browser } from 'playwright';
import { joinMeeting } from './join';
import { CaptionMerger } from './merge';
import { setupCaptions } from './captions';
import { sendWebhookUpdate } from './post';
import { SELECTORS } from './selectors';

export interface RunBotParams {
  jobId: string;
  meetingId: string;
  meetingUrl: string;
  botName?: string;
  onFinished?: () => void;
}

export class BotJobSession {
  public jobId: string;
  public meetingId: string;
  public isRunning: boolean = true;
  private browser: Browser | null = null;
  private shouldStop: boolean = false;

  constructor(jobId: string, meetingId: string) {
    this.jobId = jobId;
    this.meetingId = meetingId;
  }

  public stop() {
    console.log(`[BOT_SESSION] Stop signal received for job ${this.jobId}`);
    this.shouldStop = true;
    if (this.browser) {
      this.browser.close().catch(() => {});
    }
  }

  public async start({ meetingUrl, botName }: { meetingUrl: string; botName?: string }) {
    const headless = process.env.HEADLESS !== 'false';
    const admitTimeoutMin = parseInt(process.env.ADMIT_TIMEOUT_MIN || '10', 10);
    const maxMeetingMin = parseInt(process.env.MAX_MEETING_MIN || '120', 10);
    const meetingStartTimeMs = Date.now();

    const merger = new CaptionMerger(meetingStartTimeMs);

    try {
      // 1. Join Meeting & Wait for Admission
      const { browser, page } = await joinMeeting({
        meetingUrl,
        botName: botName || process.env.BOT_NAME || 'My Own Bot',
        headless,
        admitTimeoutMinutes: admitTimeoutMin,
      });

      this.browser = browser;

      // 2. Notify AutoSync Meet that bot is in call
      await sendWebhookUpdate({
        meeting_id: this.meetingId,
        bot_id: this.jobId,
        status: 'in_progress',
      });

      // 3. Enable Captions and DOM Observer
      await setupCaptions(page, merger);

      console.log(`[BOT_SESSION] Active in call. Capturing live captions...`);

      // 4. In-Call Watcher Loop
      const maxDurationMs = maxMeetingMin * 60 * 1000;
      let aloneInCallSeconds = 0;

      while (this.isRunning && !this.shouldStop) {
        if (Date.now() - meetingStartTimeMs > maxDurationMs) {
          console.log(`[BOT_SESSION] Reached max meeting duration limit (${maxMeetingMin} min). Leaving.`);
          break;
        }

        // Check if host ended call or bot was removed
        try {
          for (const marker of SELECTORS.deniedMarkers) {
            const el = await page.$(marker);
            if (el && (await el.isVisible())) {
              console.log(`[BOT_SESSION] Call termination dialog detected: ${marker}`);
              this.shouldStop = true;
              break;
            }
          }
        } catch {
          // Ignore
        }

        if (this.shouldStop) break;

        // Check participant presence: if alone in call for > 30 seconds, wrap up
        try {
          const participantCountEl = await page.$('div[aria-label*="participant" i], button[aria-label*="people" i]');
          if (participantCountEl) {
            const text = (await participantCountEl.textContent()) || '';
            const match = text.match(/\d+/);
            if (match) {
              const count = parseInt(match[0], 10);
              if (count <= 1) {
                aloneInCallSeconds += 5;
                if (aloneInCallSeconds >= 30) {
                  console.log('[BOT_SESSION] Bot is alone in the call. Ending session.');
                  break;
                }
              } else {
                aloneInCallSeconds = 0;
              }
            }
          }
        } catch {
          // Ignore
        }

        await page.waitForTimeout(5000);
      }

      // 5. Wrap Up & Compile Transcript
      merger.flushCurrentUtterance();
      const rawTranscript = merger.buildFormattedTranscript();
      const speakers = merger.getSpeakers();
      const durationSeconds = Math.max(1, Math.round((Date.now() - meetingStartTimeMs) / 1000));

      console.log(`[BOT_SESSION] Meeting finished. Delivering transcript (${rawTranscript.length} chars, ${speakers.length} speakers)...`);

      // 6. Deliver Transcript via Webhook
      await sendWebhookUpdate({
        meeting_id: this.meetingId,
        bot_id: this.jobId,
        status: 'transcribed',
        raw_text: rawTranscript || '[00:00] Meeting concluded without captions recorded.',
        speakers: speakers.length > 0 ? speakers : ['Participants'],
        duration_seconds: durationSeconds,
      });
    } catch (err: any) {
      console.error(`[BOT_SESSION] Error in bot job ${this.jobId}:`, err.message);

      await sendWebhookUpdate({
        meeting_id: this.meetingId,
        bot_id: this.jobId,
        status: 'failed',
        error: err.message || 'Bot encountered an error in meeting',
      });
    } finally {
      this.isRunning = false;
      if (this.browser) {
        try {
          await this.browser.close();
        } catch {}
      }
      console.log(`[BOT_SESSION] Closed job ${this.jobId}`);
    }
  }
}
