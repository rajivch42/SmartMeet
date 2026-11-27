// Jira Cloud REST API v3 Service
import { ActionItem } from '@/types/database';

export interface JiraConfig {
  domain?: string | null;
  userEmail?: string | null;
  apiToken?: string | null;
  projectKey?: string | null;
}

export interface JiraIssueResult {
  actionItemId: string;
  jiraIssueKey: string;
  jiraIssueUrl: string;
  simulated: boolean;
}

let demoCounter = 100;

/**
 * Creates a Jira issue for an extracted meeting action item.
 */
export async function createJiraIssue(
  actionItem: ActionItem,
  customConfig?: JiraConfig
): Promise<JiraIssueResult> {
  const domain = customConfig?.domain || process.env.JIRA_HOST_DOMAIN || 'company.atlassian.net';
  const userEmail = customConfig?.userEmail || process.env.JIRA_USER_EMAIL;
  const apiToken = customConfig?.apiToken || process.env.JIRA_API_TOKEN;
  const projectKey = customConfig?.projectKey || process.env.JIRA_DEFAULT_PROJECT_KEY || 'ENG';

  // Only use simulated demo if running with pure unconfigured example defaults
  const isPureDemo =
    (!domain || domain.includes('company.atlassian.net') || domain.includes('example')) &&
    (!userEmail || userEmail.includes('company.internal') || userEmail.includes('example.com'));

  if (isPureDemo) {
    demoCounter += 1;
    const mockKey = `${projectKey}-${demoCounter}`;
    const cleanDomain = (domain || 'company.atlassian.net').replace(/^https?:\/\//, '');
    const mockUrl = `https://${cleanDomain}/browse/${mockKey}`;

    console.log(`[JIRA_DEMO] Offline demo Jira issue created: ${mockKey} for "${actionItem.title}"`);

    return {
      actionItemId: actionItem.id,
      jiraIssueKey: mockKey,
      jiraIssueUrl: mockUrl,
      simulated: true,
    };
  }

  // If real domain is configured, require valid API token
  if (!apiToken || apiToken.includes('placeholder')) {
    throw new Error(
      `Jira API token is missing in .env.local (JIRA_API_TOKEN is currently set to placeholder). Please create an API token at https://id.atlassian.com/manage-profile/security/api-tokens, paste it in .env.local, and save the file.`
    );
  }

  if (!userEmail) {
    throw new Error('Jira user email is missing in .env.local (JIRA_USER_EMAIL).');
  }

  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const basicAuth = Buffer.from(`${userEmail}:${apiToken}`).toString('base64');

  // Format due date YYYY-MM-DD for Jira
  let formattedDueDate: string | null = null;
  if (actionItem.due_date) {
    try {
      formattedDueDate = new Date(actionItem.due_date).toISOString().split('T')[0];
    } catch {
      formattedDueDate = null;
    }
  }

  const fieldsPayload: Record<string, unknown> = {
    project: { key: projectKey },
    summary: actionItem.title,
    description: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text:
                actionItem.description ||
                `Action item extracted automatically by AutoSync Meet assistant. Assignee: ${
                  actionItem.assignee_name || 'Unassigned'
                }`,
            },
          ],
        },
      ],
    },
    issuetype: { name: 'Task' },
  };

  if (formattedDueDate) {
    fieldsPayload.duedate = formattedDueDate;
  }

  // Map Priority (High, Medium, Low)
  if (actionItem.priority) {
    const prioMap: Record<string, string> = {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      urgent: 'Highest',
    };
    const jiraPrio = prioMap[actionItem.priority.toLowerCase()] || 'Medium';
    fieldsPayload.priority = { name: jiraPrio };
  }

  // Attach Labels
  fieldsPayload.labels = ['autosync-meet', 'meeting-action-item'];

  // Automatically resolve Assignee accountId in Jira
  if (actionItem.assignee_email || actionItem.assignee_name) {
    try {
      const query = actionItem.assignee_email || actionItem.assignee_name;
      const searchRes = await fetch(
        `https://${cleanDomain}/rest/api/3/user/search?query=${encodeURIComponent(query!)}`,
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (searchRes.ok) {
        const users = await searchRes.json();
        if (Array.isArray(users) && users.length > 0 && users[0].accountId) {
          fieldsPayload.assignee = { accountId: users[0].accountId };
        }
      }
    } catch {
      // Continue without assignee if search fails
    }
  }

  const url = `https://${cleanDomain}/rest/api/3/issue`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ fields: fieldsPayload }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMsg = `Jira API error (status ${response.status})`;
    try {
      const parsedErr = JSON.parse(errorBody);
      if (parsedErr.errorMessages?.length > 0) {
        errorMsg += `: ${parsedErr.errorMessages.join(', ')}`;
      } else if (parsedErr.errors) {
        errorMsg += `: ${Object.entries(parsedErr.errors).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
      } else {
        errorMsg += `: ${errorBody}`;
      }
    } catch {
      errorMsg += `: ${errorBody}`;
    }

    if (response.status === 401) {
      errorMsg += ` - Authentication failed. Please verify that your JIRA_USER_EMAIL (${userEmail}) and JIRA_API_TOKEN in .env.local match your Atlassian account.`;
    }

    throw new Error(errorMsg);
  }

  const data = await response.json();
  const issueKey = data.key;
  const issueUrl = `https://${cleanDomain}/browse/${issueKey}`;

  // If Jira automatically assigned the new issue to 'Done' because of board column order,
  // ensure it is transitioned to 'To Do' so it is created as open work
  try {
    const transitionsRes = await fetch(`https://${cleanDomain}/rest/api/3/issue/${issueKey}/transitions`, {
      headers: { Authorization: `Basic ${basicAuth}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (transitionsRes.ok) {
      const transData = await transitionsRes.json();
      const toDoTransition = transData.transitions?.find(
        (t: any) => t.name?.toLowerCase() === 'to do' || t.to?.name?.toLowerCase() === 'to do'
      );
      if (toDoTransition) {
        await fetch(`https://${cleanDomain}/rest/api/3/issue/${issueKey}/transitions`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transition: { id: toDoTransition.id } }),
          signal: AbortSignal.timeout(5000),
        });
      }
    }
  } catch (err) {
    console.warn(`[JIRA] Failed to ensure issue ${issueKey} is transitioned to To Do:`, err);
  }

  return {
    actionItemId: actionItem.id,
    jiraIssueKey: issueKey,
    jiraIssueUrl: issueUrl,
    simulated: false,
  };
}

/**
 * Pushes multiple action items to Jira in parallel.
 */
export async function batchCreateJiraIssues(
  actionItems: ActionItem[],
  customConfig?: JiraConfig
): Promise<JiraIssueResult[]> {
  const results: JiraIssueResult[] = [];
  for (const item of actionItems) {
    const res = await createJiraIssue(item, customConfig);
    results.push(res);
  }
  return results;
}

/**
 * Updates the due date of an existing Jira issue.
 */
export async function updateJiraIssueDueDate(
  jiraIssueKey: string,
  dueDate: string | null,
  customConfig?: JiraConfig
): Promise<{ success: boolean; message?: string }> {
  const domain = customConfig?.domain || process.env.JIRA_HOST_DOMAIN || 'company.atlassian.net';
  const userEmail = customConfig?.userEmail || process.env.JIRA_USER_EMAIL;
  const apiToken = customConfig?.apiToken || process.env.JIRA_API_TOKEN;

  const isPureDemo =
    (!domain || domain.includes('company.atlassian.net') || domain.includes('example')) &&
    (!userEmail || userEmail.includes('company.internal') || userEmail.includes('example.com'));

  let formattedDueDate: string | null = null;
  if (dueDate) {
    try {
      formattedDueDate = new Date(dueDate).toISOString().split('T')[0];
    } catch {
      formattedDueDate = null;
    }
  }

  if (isPureDemo) {
    console.log(`[JIRA_DEMO] Due date updated for ${jiraIssueKey} -> ${formattedDueDate || 'None'}`);
    return {
      success: true,
      message: `Simulated Jira issue ${jiraIssueKey} due date updated to ${formattedDueDate || 'cleared'}.`,
    };
  }

  if (!apiToken || apiToken.includes('placeholder')) {
    throw new Error('Jira API token is missing or placeholder in .env.local.');
  }

  if (!userEmail) {
    throw new Error('Jira user email is missing in .env.local.');
  }

  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const basicAuth = Buffer.from(`${userEmail}:${apiToken}`).toString('base64');

  const url = `https://${cleanDomain}/rest/api/3/issue/${jiraIssueKey}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      fields: {
        duedate: formattedDueDate,
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.warn(`[JIRA] Failed to update due date for ${jiraIssueKey}:`, errorBody);
    return { success: false, message: `Jira API error (${response.status}): ${errorBody}` };
  }

  return { success: true, message: `Jira issue ${jiraIssueKey} due date updated to ${formattedDueDate || 'cleared'}.` };
}

/**
 * Fetches the current live status and due date for a Jira issue.
 */
export async function syncJiraIssueStatus(jiraIssueKey: string): Promise<{
  statusName: string;
  isDone: boolean;
  dueDate: string | null;
} | null> {
  const domain = process.env.JIRA_HOST_DOMAIN || 'vit-team-z9uxt7fk.atlassian.net';
  const apiToken = process.env.JIRA_API_TOKEN;
  const userEmail = process.env.JIRA_USER_EMAIL;

  if (!apiToken || apiToken.includes('placeholder') || !userEmail) {
    return null;
  }

  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const basicAuth = Buffer.from(`${userEmail}:${apiToken}`).toString('base64');

  try {
    const res = await fetch(`https://${cleanDomain}/rest/api/3/issue/${jiraIssueKey}?fields=status,duedate,resolution`, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const statusName = data.fields?.status?.name || 'To Do';
    const statusCategory = data.fields?.status?.statusCategory?.key;
    const resolution = data.fields?.resolution;
    const nameLower = statusName.toLowerCase();
    const isToDoOrInProgress = nameLower === 'to do' || nameLower === 'in progress';
    const isDone = !isToDoOrInProgress && (statusCategory === 'done' || !!resolution || nameLower === 'done');
    const dueDate = data.fields?.duedate || null;

    return { statusName, isDone, dueDate };
  } catch (err) {
    console.warn(`[JIRA] Failed to sync status for ${jiraIssueKey}:`, err);
    return null;
  }
}
