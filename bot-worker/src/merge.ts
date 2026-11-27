/**
 * Caption Stream Merger & Debouncer.
 * Turns rapid Google Meet DOM caption mutations into clean speaker turns.
 */

export interface Utterance {
  speaker: string;
  text: string;
  startTimeSec: number;
  endTimeSec: number;
}

export class CaptionMerger {
  private completedUtterances: Utterance[] = [];
  private currentSpeaker: string | null = null;
  private currentTextBuffer: string = '';
  private currentStartSec: number = 0;
  private lastUpdateTimestampMs: number = Date.now();
  private meetingStartTimestampMs: number = Date.now();
  private flushTimer: NodeJS.Timeout | null = null;

  // Speaker set
  private uniqueSpeakers: Set<string> = new Set();

  constructor(meetingStartTimestampMs: number = Date.now()) {
    this.meetingStartTimestampMs = meetingStartTimestampMs;
  }

  /**
   * Ingests a caption chunk from the DOM observer.
   */
  public pushUpdate(speaker: string, rawText: string) {
    const cleanSpeaker = speaker.trim() || 'Speaker';
    const cleanText = rawText.trim();
    if (!cleanText) return;

    this.uniqueSpeakers.add(cleanSpeaker);

    const nowMs = Date.now();
    const elapsedSec = Math.max(0, Math.round((nowMs - this.meetingStartTimestampMs) / 1000));

    // If speaker changed from previous speaker
    if (this.currentSpeaker && this.currentSpeaker !== cleanSpeaker) {
      this.flushCurrentUtterance(elapsedSec);
      this.currentSpeaker = cleanSpeaker;
      this.currentTextBuffer = cleanText;
      this.currentStartSec = elapsedSec;
    } else {
      // Same speaker speaking
      if (!this.currentSpeaker) {
        this.currentSpeaker = cleanSpeaker;
        this.currentStartSec = elapsedSec;
      }
      this.currentTextBuffer = cleanText;
    }

    this.lastUpdateTimestampMs = nowMs;

    // Reset inactivity flush timer (if silence > 3.0s, commit utterance)
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushCurrentUtterance(elapsedSec + 3);
    }, 3000);
  }

  /**
   * Flushes the current in-progress buffer to completedUtterances.
   */
  public flushCurrentUtterance(endSec?: number) {
    if (this.currentSpeaker && this.currentTextBuffer) {
      const nowMs = Date.now();
      const finalEndSec = endSec || Math.max(0, Math.round((nowMs - this.meetingStartTimestampMs) / 1000));

      this.completedUtterances.push({
        speaker: this.currentSpeaker,
        text: this.currentTextBuffer,
        startTimeSec: this.currentStartSec,
        endTimeSec: Math.max(this.currentStartSec + 1, finalEndSec),
      });

      this.currentSpeaker = null;
      this.currentTextBuffer = '';
    }
  }

  /**
   * Builds the formatted transcript string expected by AutoSync Meet.
   * Example:
   * [00:15] Rajiv: Let's review the API documentation before Friday.
   * [00:32] Yogesh: I will verify the endpoint.
   */
  public buildFormattedTranscript(): string {
    this.flushCurrentUtterance();

    if (this.completedUtterances.length === 0) {
      return '';
    }

    const formatTime = (secs: number) => {
      const mins = Math.floor(secs / 60);
      const remainingSecs = Math.floor(secs % 60);
      return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
    };

    return this.completedUtterances
      .map((u) => `[${formatTime(u.startTimeSec)}] ${u.speaker}: ${u.text}`)
      .join('\n');
  }

  public getSpeakers(): string[] {
    return Array.from(this.uniqueSpeakers);
  }

  public getUtteranceCount(): number {
    return this.completedUtterances.length + (this.currentTextBuffer ? 1 : 0);
  }
}
