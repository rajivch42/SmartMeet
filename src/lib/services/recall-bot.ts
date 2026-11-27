// Recall.ai Meeting Bot Service
import { Transcript } from '@/types/database';

export interface DispatchBotParams {
  meetingUrl: string;
  botName?: string;
  meetingId?: string;
}

export interface RecallBotResponse {
  botId: string;
  status: string;
  meetingUrl: string;
  isRealBot?: boolean;
}

export function isRecallDemoMode(): boolean {
  const apiKey = process.env.RECALL_AI_API_KEY;
  return !apiKey || apiKey === 'placeholder-recall-key' || apiKey.includes('placeholder') || apiKey.length < 10;
}

/**
 * Dispatches a Recall.ai bot to join a Google Meet room.
 * Validates webhook URLs to prevent 403 request_blocked on localhost.
 */
export async function dispatchRecallBot({
  meetingUrl,
  botName = 'AutoSync AI Assistant',
  meetingId,
}: DispatchBotParams): Promise<RecallBotResponse> {
  const apiKey = process.env.RECALL_AI_API_KEY;
  const isDemo = isRecallDemoMode();

  if (isDemo) {
    console.log(`[RECALL_BOT_DEMO] Dispatching simulated bot to ${meetingUrl}...`);
    const botId = `recall-bot-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    return {
      botId,
      status: 'bot_dispatched',
      meetingUrl,
      isRealBot: false,
    };
  }

  try {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
    const isLocalhost = appUrl.includes('localhost') || appUrl.includes('127.0.0.1');
    const isValidPublicHttps = appUrl.startsWith('https://') && !isLocalhost;
    
    // Recall.ai security rule: Never send localhost in payload, or Recall will return 403 request_blocked!
    const webhookUrl = isValidPublicHttps ? `${appUrl.replace(/\/$/, '')}/api/webhooks/recall` : undefined;

    const region = process.env.RECALL_AI_REGION;
    const apiUrl = region && region !== 'us-east-1'
      ? `https://${region}.recall.ai/api/v1/bot/`
      : 'https://api.recall.ai/api/v1/bot/';

    const payload: Record<string, unknown> = {
      meeting_url: meetingUrl,
      bot_name: botName,
      transcription_options: {
        provider: {
          meeting_captions: {},
        },
      },
    };

    if (webhookUrl) {
      payload.webhook_url = webhookUrl;
    }

    console.log(`[RECALL_BOT] Calling Recall API (${apiUrl}) for meeting ${meetingUrl}...`, {
      hasWebhook: !!webhookUrl,
      region,
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[RECALL_BOT] API returned error ${response.status}:`, errText);
      throw new Error(`Recall.ai API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    console.log(`[RECALL_BOT] Bot created successfully! ID: ${data.id}`);

    return {
      botId: data.id,
      status: data.status?.code || 'bot_dispatched',
      meetingUrl,
      isRealBot: true,
    };
  } catch (error) {
    console.error('[RECALL_BOT] Exception dispatching bot:', error);
    throw error;
  }
}

/**
 * Fetches real bot details and status directly from Recall.ai API.
 */
export async function getRecallBotDetails(botId: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.RECALL_AI_API_KEY;
  if (!apiKey || isRecallDemoMode() || botId.startsWith('recall-bot-')) {
    return null;
  }

  const region = process.env.RECALL_AI_REGION;
  const baseUrl = region && region !== 'us-east-1'
    ? `https://${region}.recall.ai/api/v1`
    : 'https://api.recall.ai/api/v1';

  try {
    const response = await fetch(`${baseUrl}/bot/${botId}/`, {
      headers: {
        Authorization: `Token ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error(`[RECALL_BOT] Error fetching bot details for ${botId}:`, err);
    return null;
  }
}

/**
 * Fetches the real diarized transcript from Recall.ai for a finished bot session.
 * Automatically initiates async transcription if not yet started, and downloads the result.
 */
export async function fetchRecallBotTranscript(botId: string): Promise<{
  raw_text: string;
  speakers: string[];
  duration_seconds: number;
} | null> {
  const apiKey = process.env.RECALL_AI_API_KEY;
  if (!apiKey || isRecallDemoMode() || botId.startsWith('recall-bot-')) {
    return null;
  }

  const region = process.env.RECALL_AI_REGION;
  const baseUrl = region && region !== 'us-east-1'
    ? `https://${region}.recall.ai/api/v1`
    : 'https://api.recall.ai/api/v1';

  try {
    // 1. Check dedicated bot transcript endpoint
    try {
      const response = await fetch(`${baseUrl}/bot/${botId}/transcript/`, {
        headers: {
          Authorization: `Token ${apiKey}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        let transcriptData = await response.json();

        if (transcriptData && typeof transcriptData === 'object' && !Array.isArray(transcriptData)) {
          const obj = transcriptData as Record<string, unknown>;
          const innerData = obj.data as Record<string, unknown> | undefined;
          const downloadUrl = (innerData?.download_url || obj.download_url) as string | undefined;
          if (typeof downloadUrl === 'string') {
            const dlRes = await fetch(downloadUrl);
            if (dlRes.ok) {
              transcriptData = await dlRes.json();
            }
          }
        }

        if (Array.isArray(transcriptData) && transcriptData.length > 0) {
          return parseRecallTranscript(transcriptData);
        } else if (
          transcriptData &&
          typeof transcriptData === 'object' &&
          Array.isArray((transcriptData as Record<string, unknown>).parts)
        ) {
          return parseRecallTranscript((transcriptData as Record<string, unknown>).parts as Record<string, unknown>[]);
        }
      }
    } catch {
      // Continue to recording lookup
    }

    // 2. Inspect bot details and recordings
    const botData = await getRecallBotDetails(botId);
    if (!botData) return null;

    // Check inline bot transcript
    if (Array.isArray(botData.transcript) && botData.transcript.length > 0) {
      return parseRecallTranscript(botData.transcript as Record<string, unknown>[]);
    }

    const recordings = Array.isArray(botData.recordings) ? (botData.recordings as Record<string, unknown>[]) : [];
    for (const rec of recordings) {
      const recId = rec.id as string;
      if (!recId) continue;

      // Check media shortcuts transcript
      const shortcuts = rec.media_shortcuts as Record<string, unknown> | undefined;
      const msTranscript = shortcuts?.transcript as Record<string, unknown> | undefined;
      const msDlUrl = (msTranscript?.data as Record<string, unknown> | undefined)?.download_url as string | undefined;
      if (msDlUrl) {
        const dlRes = await fetch(msDlUrl);
        if (dlRes.ok) {
          const tData = await dlRes.json();
          if (Array.isArray(tData) && tData.length > 0) {
            return parseRecallTranscript(tData);
          }
        }
      }

      // Check existing transcript jobs for this recording
      try {
        const jobsRes = await fetch(`${baseUrl}/transcript/?recording_id=${recId}`, {
          headers: {
            Authorization: `Token ${apiKey}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          const results = Array.isArray(jobsData?.results) ? (jobsData.results as Record<string, unknown>[]) : [];
          for (const job of results) {
            const statusCode = (job?.status as Record<string, unknown> | undefined)?.code;
            const dlUrl = (job?.data as Record<string, unknown> | undefined)?.download_url as string | undefined;
            if (statusCode === 'done' && dlUrl) {
              const dlRes = await fetch(dlUrl);
              if (dlRes.ok) {
                const tData = await dlRes.json();
                if (Array.isArray(tData) && tData.length > 0) {
                  return parseRecallTranscript(tData);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[RECALL_BOT] Warning querying transcript jobs for ${recId}:`, err);
      }

      // If recording is completed and no transcript exists yet, automatically initiate async transcription!
      const recStatus = (rec.status as Record<string, unknown> | undefined)?.code;
      if (recStatus === 'done') {
        console.log(`[RECALL_BOT] Triggering async transcription job for recording ${recId}...`);
        try {
          const createRes = await fetch(`${baseUrl}/recording/${recId}/create_transcript/`, {
            method: 'POST',
            headers: {
              Authorization: `Token ${apiKey}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              provider: {
                recallai_async: {
                  language_code: 'auto',
                },
              },
            }),
          });

          if (createRes.ok) {
            const job = await createRes.json();
            const dlUrl = (job?.data as Record<string, unknown> | undefined)?.download_url as string | undefined;
            if (job?.status?.code === 'done' && dlUrl) {
              const dlRes = await fetch(dlUrl);
              if (dlRes.ok) {
                const tData = await dlRes.json();
                if (Array.isArray(tData) && tData.length > 0) {
                  return parseRecallTranscript(tData);
                }
              }
            }
          }
        } catch (err) {
          console.warn(`[RECALL_BOT] Error triggering async transcription for ${recId}:`, err);
        }
      }
    }

    return null;
  } catch (err) {
    console.error(`[RECALL_BOT] Error fetching transcript for ${botId}:`, err);
    return null;
  }
}

function parseRecallTranscript(transcriptData: Record<string, unknown>[]): {
  raw_text: string;
  speakers: string[];
  duration_seconds: number;
} {
  let fullText = '';
  const speakerSet = new Set<string>();
  let lastTimestamp = 0;

  for (const item of transcriptData) {
    const participant = item.participant as Record<string, unknown> | undefined;
    const speaker = (item.speaker as string) || (participant?.name as string) || 'Speaker';
    speakerSet.add(speaker);

    let sentence = '';
    if (Array.isArray(item.words)) {
      sentence = item.words
        .map((w: Record<string, unknown>) => {
          let end = 0;
          if (typeof w.end_timestamp === 'number') {
            end = w.end_timestamp;
          } else if (w.end_timestamp && typeof w.end_timestamp === 'object') {
            const rel = (w.end_timestamp as Record<string, unknown>).relative;
            if (typeof rel === 'number') end = rel;
          }
          if (end > lastTimestamp) {
            lastTimestamp = end;
          }
          return (w.text as string) || '';
        })
        .join(' ');
    } else if (typeof item.text === 'string') {
      sentence = item.text;
    } else if (typeof item.data === 'string') {
      sentence = item.data;
    }

    if (sentence.trim().length > 0) {
      const timeTag = lastTimestamp > 0 ? `[${formatTime(lastTimestamp)}] ` : '';
      fullText += `${timeTag}${speaker}: ${sentence.trim()}\n`;
    }
  }

  return {
    raw_text: fullText.trim(),
    speakers: Array.from(speakerSet),
    duration_seconds: Math.round(lastTimestamp) || 60,
  };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Realistic seed transcript for demo fallback only when no API key is provided.
 */
export function generateDemoTranscript(meetingId: string): Partial<Transcript> {
  const rawDialogue = `[00:05] Alex Morgan: Good morning everyone. Let's kick off today's sync. We have two key topics: finalizing our database architecture choice and assigning our sprint deliverables.
[00:22] Jordan Rivera: Thanks Alex. Looking at our query patterns and transaction volume, we need ACID guarantees and strict relational consistency. We decided to adopt PostgreSQL 16 rather than MongoDB for our core transactional database.
[00:48] Alex Morgan: That makes total sense. I'll take full ownership of the database migration. Alex will finalize the schema migration script and verify foreign keys by Friday at 5:00 PM.
[01:14] Jordan Rivera: Excellent. Sarah, could you handle the API security specification and audit our OAuth endpoints?
[01:28] Sarah Chen: Absolutely. Sarah will review the API security policy and prepare the OAuth documentation by Thursday at 12:00 PM noon.
[01:45] Jordan Rivera: Fantastic. Decisions and tasks are documented. Let's wrap up and get building.
[01:58] Alex Morgan: Thanks team, meeting adjourned.`;

  return {
    meeting_id: meetingId,
    raw_text: rawDialogue,
    speakers: ['Alex Morgan', 'Jordan Rivera', 'Sarah Chen'],
    duration_seconds: 125,
  };
}
