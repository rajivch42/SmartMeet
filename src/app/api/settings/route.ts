import { NextResponse, type NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

function readEnvLocal(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env: Record<string, string> = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  });
  return env;
}

function updateEnvLocal(updates: Record<string, string>) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  Object.entries(updates).forEach(([key, value]) => {
    process.env[key] = value;
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  });

  fs.writeFileSync(envPath, content, 'utf8');
}

export async function GET() {
  const env = readEnvLocal();
  const token = env.JIRA_API_TOKEN || process.env.JIRA_API_TOKEN || '';
  const isPlaceholder = !token || token.includes('placeholder');

  return NextResponse.json({
    success: true,
    data: {
      jira_host_domain: env.JIRA_HOST_DOMAIN || process.env.JIRA_HOST_DOMAIN || 'vit-team-z9uxt7fk.atlassian.net',
      jira_user_email: env.JIRA_USER_EMAIL || process.env.JIRA_USER_EMAIL || '',
      jira_default_project_key: env.JIRA_DEFAULT_PROJECT_KEY || process.env.JIRA_DEFAULT_PROJECT_KEY || 'KAN',
      has_valid_jira_token: !isPlaceholder,
      token_preview: !isPlaceholder ? `${token.substring(0, 4)}...${token.slice(-4)}` : '',
      slack_webhook_url: env.SLACK_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || '',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updates: Record<string, string> = {};

    if (body.jira_host_domain) updates.JIRA_HOST_DOMAIN = body.jira_host_domain.trim();
    if (body.jira_user_email) updates.JIRA_USER_EMAIL = body.jira_user_email.trim();
    if (body.jira_default_project_key) updates.JIRA_DEFAULT_PROJECT_KEY = body.jira_default_project_key.trim();
    if (body.jira_api_token && body.jira_api_token.trim().length > 0) {
      updates.JIRA_API_TOKEN = body.jira_api_token.trim();
    }
    if (body.slack_webhook_url) updates.SLACK_WEBHOOK_URL = body.slack_webhook_url.trim();

    updateEnvLocal(updates);

    return NextResponse.json({
      success: true,
      message: 'Integration settings saved successfully to .env.local!',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to save settings';
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
