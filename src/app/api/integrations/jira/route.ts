import { NextResponse, type NextRequest } from 'next/server';
import {
  getActionItemsByMeetingId,
  getAllActionItems,
  updateActionItemJira,
  updateActionItem,
  deleteActionItem,
} from '@/lib/services/meeting-store';
import { createJiraIssue, syncJiraIssueStatus } from '@/lib/services/jira';
import { ActionItem } from '@/types/database';
import { z } from 'zod';

const jiraSyncSchema = z.object({
  meeting_id: z.string().optional(),
  action_item_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { meeting_id, action_item_id } = jiraSyncSchema.parse(body);

    let itemsToSync: ActionItem[] = [];

    if (action_item_id) {
      const all = await getAllActionItems();
      const match = all.find((a) => a.id === action_item_id);
      if (match) itemsToSync = [match];
    } else if (meeting_id) {
      itemsToSync = await getActionItemsByMeetingId(meeting_id);
    } else {
      itemsToSync = (await getAllActionItems()).filter((a) => a.status !== 'synced_to_jira');
    }

    if (itemsToSync.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No pending action items found to sync with Jira.',
        data: [],
      });
    }

    const results = [];
    for (const item of itemsToSync) {
      const jiraResult = await createJiraIssue(item);
      const updated = await updateActionItemJira(
        item.id,
        jiraResult.jiraIssueKey,
        jiraResult.jiraIssueUrl
      );
      results.push({
        action_item_id: item.id,
        title: item.title,
        jira_issue_key: jiraResult.jiraIssueKey,
        jira_issue_url: jiraResult.jiraIssueUrl,
        simulated: jiraResult.simulated,
        action_item: updated,
      });
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.errors.map((e) => e.message).join(', ') } },
        { status: 400 }
      );
    }

    const msg = error instanceof Error ? error.message : 'Jira sync error';
    return NextResponse.json(
      { success: false, error: { code: 'JIRA_SYNC_FAILED', message: msg } },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return all action items with their current Jira sync status
  const all = await getAllActionItems();

  // Bi-directional sync: check live Jira status for synced items
  for (const item of all) {
    if (item.jira_issue_key) {
      try {
        const live = await syncJiraIssueStatus(item.jira_issue_key);
        if (live) {
          if (live.isDone && item.status !== 'completed') {
            item.status = 'completed';
            await updateActionItem(item.id, { status: 'completed' });
          } else if (!live.isDone && item.status === 'completed') {
            item.status = 'synced_to_jira';
            await updateActionItem(item.id, { status: 'synced_to_jira' });
          }
        }
      } catch {}
    }
  }

  return NextResponse.json({
    success: true,
    count: all.length,
    data: all,
  });
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.action_item_id;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_ID', message: 'Action item ID is required.' } },
        { status: 400 }
      );
    }

    await deleteActionItem(id);
    return NextResponse.json({ success: true, message: 'Action item deleted.' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete action item';
    return NextResponse.json({ success: false, error: { code: 'DELETE_FAILED', message: msg } }, { status: 500 });
  }
}
