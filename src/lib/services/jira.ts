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
