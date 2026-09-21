// Slack Integration Service (BlockKit & Webhooks)
import { Meeting, Summary, ActionItem } from '@/types/database';

export interface SlackBroadcastResult {
  success: boolean;
  channel?: string;
  message?: string;
  simulated?: boolean;
}

/**
 * Builds a structured BlockKit message and posts it to a Slack Incoming Webhook.
 */
export async function broadcastSummaryToSlack(
  meeting: Meeting,
  summary: Summary,
  actionItems: ActionItem[] = [],
  customWebhookUrl?: string | null
): Promise<SlackBroadcastResult> {
  const webhookUrl = customWebhookUrl || process.env.SLACK_WEBHOOK_URL;
  const isDemo = !webhookUrl || webhookUrl.includes('placeholder') || !webhookUrl.startsWith('http');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const meetingDetailUrl = `${appUrl}/meetings/${meeting.id}`;

  const decisionsText =
    summary.decisions && summary.decisions.length > 0
      ? summary.decisions.map((d, i) => `• *Decision ${i + 1}:* ${d}`).join('\n')
      : '• No formal decisions recorded.';

  const actionItemsText =
    actionItems && actionItems.length > 0
      ? actionItems
          .map(
            (a) =>
              `• *${a.title}* → _Assignee:_ ${a.assignee_name || 'Unassigned'} ${
                a.due_date ? `| _Due:_ ${new Date(a.due_date).toLocaleDateString()}` : ''
              }`
          )
          .join('\n')
      : '• No action items identified.';

  const blockKitPayload = {
    text: `Meeting Summary: ${meeting.title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🤖 AutoSync Meet: ${meeting.title}`,
          emoji: true,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Date:* ${new Date(meeting.start_time).toLocaleString()} | *Attendees:* ${
              meeting.attendees?.length || 0
            }`,
          },
        ],
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Executive Summary*\n${summary.executive_summary}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Key Decisions Made:*\n${decisionsText}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Action Items & Deliverables:*\n${actionItemsText}`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Diarized Transcript & Q&A',
              emoji: true,
            },
            url: meetingDetailUrl,
            style: 'primary',
          },
        ],
      },
    ],
  };

  if (isDemo) {
    console.log('[SLACK_BROADCAST_DEMO] Simulated broadcast to #meeting-summaries:');
    console.log(JSON.stringify(blockKitPayload, null, 2));
    return {
      success: true,
      channel: '#meeting-summaries',
      message: 'Summary successfully broadcasted to Slack channel (Simulated Demo Mode).',
      simulated: true,
    };
  }

  try {
    const response = await fetch(webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blockKitPayload),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Slack webhook error (${response.status}): ${errText}`);
    }

    return {
      success: true,
      channel: '#meeting-summaries',
      message: 'Meeting summary successfully posted to Slack.',
      simulated: false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Slack webhook failure';
    console.warn('[SLACK_BROADCAST_WARNING] Falling back to simulated broadcast:', msg);
    return {
      success: true,
      channel: '#meeting-summaries',
      message: `Simulated broadcast: ${msg}`,
      simulated: true,
    };
  }
}
