import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const domain = body.domain || process.env.JIRA_HOST_DOMAIN;
    const userEmail = body.user_email || process.env.JIRA_USER_EMAIL;
    const apiToken = body.api_token || process.env.JIRA_API_TOKEN;
    const projectKey = body.project_key || process.env.JIRA_DEFAULT_PROJECT_KEY || 'KAN';

    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'Jira Host Domain is required (e.g. your-org.atlassian.net).' },
        { status: 400 }
      );
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'Atlassian User Email is required.' },
        { status: 400 }
      );
    }

    if (!apiToken || apiToken.includes('placeholder')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Jira API Token is missing or set to placeholder. Please generate an API token at https://id.atlassian.com/manage-profile/security/api-tokens.',
        },
        { status: 400 }
      );
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const basicAuth = Buffer.from(`${userEmail}:${apiToken}`).toString('base64');

    // 1. Verify user authentication
    const authUrl = `https://${cleanDomain}/rest/api/3/myself`;
    const authRes = await fetch(authUrl, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!authRes.ok) {
      const errText = await authRes.text();
      let msg = `Authentication failed (${authRes.status})`;
      if (authRes.status === 401) {
        msg = `Invalid Atlassian credentials (401 Unauthorized). Make sure your email (${userEmail}) and API Token match your Atlassian account at https://id.atlassian.com.`;
      } else {
        msg += `: ${errText}`;
      }
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    const authData = await authRes.json();

    // 2. Verify project exists
    const projUrl = `https://${cleanDomain}/rest/api/3/project/${projectKey}`;
    const projRes = await fetch(projUrl, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    let projectTitle = projectKey;
    if (projRes.ok) {
      const projData = await projRes.json();
      projectTitle = `${projData.name} (${projData.key})`;
    } else {
      return NextResponse.json({
        success: true,
        warning: `Connected as ${authData.displayName || userEmail}, but project '${projectKey}' was not found. Please verify your Project Key in Jira.`,
        data: { user: authData.displayName, email: authData.emailAddress },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Verified successfully! Connected as ${authData.displayName || userEmail} to Jira project ${projectTitle}.`,
      data: {
        user: authData.displayName,
        email: authData.emailAddress,
        project: projectTitle,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to verify Jira connection';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
