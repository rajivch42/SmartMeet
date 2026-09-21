// Task Reminder Engine Service
import { getAllActionItems, saveReminder, getAllReminders } from './meeting-store';
import { Reminder } from '@/types/database';

export interface ReminderEvaluationResult {
  evaluatedCount: number;
  remindersSent: number;
  reminders: Reminder[];
  message?: string;
}

/**
 * Checks action items for impending deadlines and dispatches real reminder alerts to Slack.
 */
export async function evaluateAndSendReminders(force: boolean = false): Promise<ReminderEvaluationResult> {
  const allTasks = await getAllActionItems();
  const now = new Date();
  // Threshold: tasks due within next 7 days (or overdue)
  const thresholdTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const existingReminders = await getAllReminders();
  const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;

  // Filter tasks that are not completed and have an impending or overdue deadline
  const urgentTasks = allTasks.filter((task) => {
    if (task.status === 'completed') return false;
    if (!task.due_date) return false;
    const due = new Date(task.due_date);
    return due <= thresholdTime;
  });

  const sentReminders: Reminder[] = [];
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const isRealSlack = webhookUrl && !webhookUrl.includes('placeholder') && webhookUrl.startsWith('http');

  for (const task of urgentTasks) {
    // Prevent duplicate reminders within 24 hours unless force flag is set
    if (!force) {
      const alreadySentRecently = existingReminders.some((r) => {
        if (r.action_item_id !== task.id) return false;
        const sentTime = r.sent_at ? new Date(r.sent_at).getTime() : 0;
        return sentTime > oneDayAgo;
      });
      if (alreadySentRecently) {
        console.log(`[REMINDER_ENGINE] Skipping task "${task.title}" — reminder was already sent within last 24h.`);
        continue;
      }
    }

    const dueDateObj = task.due_date ? new Date(task.due_date) : null;
    const formattedDue = dueDateObj
      ? dueDateObj.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      : 'Immediate';

    const diffHours = dueDateObj ? Math.round((dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60)) : 0;
    const urgencyLabel = diffHours < 0 ? '⚠️ OVERDUE' : diffHours <= 48 ? '🚨 URGENT (< 48h)' : '📅 UPCOMING';

    // 1. Dispatch genuine Slack Alert if Webhook is configured
    if (isRealSlack) {
      try {
        const slackPayload = {
          text: `⏰ Task Reminder: ${task.title} (Due ${formattedDue})`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${urgencyLabel}: Task Deadline Reminder`,
                emoji: true,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Task:* *${task.title}*\n*Assignee:* ${task.assignee_name || 'Unassigned'} ${
                  task.assignee_email ? `(<mailto:${task.assignee_email}|${task.assignee_email}>)` : ''
                }\n*Deadline:* *${formattedDue}* (${diffHours < 0 ? `${Math.abs(diffHours)}h overdue` : `in ${diffHours}h`})\n*Priority:* \`${task.priority.toUpperCase()}\` | *Status:* ${
                  task.status === 'synced_to_jira'
                    ? `Synced to Jira (*${task.jira_issue_key || 'Ticket'}*)`
                    : 'Pending Jira Sync'
                }`,
              },
            },
            ...(task.description
              ? [
                  {
                    type: 'context',
                    elements: [
                      {
                        type: 'mrkdwn',
                        text: `*Context:* ${task.description}`,
                      },
                    ],
                  },
                ]
              : []),
            ...(task.jira_issue_url
              ? [
                  {
                    type: 'actions',
                    elements: [
                      {
                        type: 'button',
                        text: {
                          type: 'plain_text',
                          text: `View in Jira (${task.jira_issue_key})`,
                          emoji: true,
                        },
                        url: task.jira_issue_url,
                        style: 'primary',
                      },
                    ],
                  },
                ]
              : []),
          ],
        };

        const res = await fetch(webhookUrl!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          console.warn(`[REMINDER_ENGINE] Slack webhook returned status ${res.status}`);
        } else {
          console.log(`[REMINDER_ENGINE] Sent Slack reminder for "${task.title}"`);
        }
      } catch (err) {
        console.warn('[REMINDER_ENGINE] Slack dispatch exception:', err);
      }
    }

    // 2. Persist reminder record to database
    const reminderRecord = await saveReminder({
      action_item_id: task.id,
      recipient_email: task.assignee_email || 'attendee@company.internal',
      scheduled_for: now.toISOString(),
      sent_at: now.toISOString(),
      status: 'sent',
      channel: 'slack',
    });

    sentReminders.push(reminderRecord);
  }

  return {
    evaluatedCount: allTasks.length,
    remindersSent: sentReminders.length,
    reminders: sentReminders,
    message: isRealSlack
      ? `Evaluated ${allTasks.length} tasks: dispatched ${sentReminders.length} reminder alert(s) to Slack.`
      : `Evaluated ${allTasks.length} tasks: recorded ${sentReminders.length} reminder(s) (Slack webhook in demo mode).`,
  };
}
