import { NextResponse, type NextRequest } from 'next/server';
import {
  getAllActionItems,
  getActionItemById,
  updateActionItem,
  saveActionItems,
  deleteActionItem,
  getMeetingsList,
} from '@/lib/services/meeting-store';
import { updateJiraIssueDueDate } from '@/lib/services/jira';
import { z } from 'zod';

const createActionItemSchema = z.object({
  meeting_id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assignee_name: z.string().optional(),
  assignee_email: z.string().email().optional().or(z.literal('')),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export async function GET() {
  const items = await getAllActionItems();
  return NextResponse.json({ success: true, count: items.length, data: items });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createActionItemSchema.parse(body);

    let meetingId = validated.meeting_id;
    if (!meetingId) {
      const meetings = await getMeetingsList();
      meetingId = meetings[0]?.id || 'custom-tasks';
    }

    const [saved] = await saveActionItems(meetingId, [
      {
        meeting_id: meetingId,
        title: validated.title,
        description: validated.description || null,
        assignee_name: validated.assignee_name || null,
        assignee_email: validated.assignee_email || null,
        due_date: validated.due_date || null,
        priority: validated.priority,
        status: 'pending',
      },
    ]);

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.errors.map((e) => e.message).join(', ') } },
        { status: 400 }
      );
    }
    const msg = error instanceof Error ? error.message : 'Failed to create action item';
    return NextResponse.json({ success: false, error: { code: 'CREATE_FAILED', message: msg } }, { status: 500 });
  }
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, due_date } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_ID', message: 'Action item ID is required.' } },
        { status: 400 }
      );
    }

    const existing = await getActionItemById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Action item not found.' } },
        { status: 404 }
      );
    }

    // Update in database (Supabase + In-Memory)
    const updated = await updateActionItem(id, {
      due_date: due_date || null,
    });

    let jiraSyncResult = null;
    // If this task was already pushed to Jira, update the Jira ticket's due date in real-time
    if (existing.jira_issue_key) {
      try {
        jiraSyncResult = await updateJiraIssueDueDate(existing.jira_issue_key, due_date || null);
      } catch (err: any) {
        console.warn('[ACTION_ITEMS] Error updating Jira due date:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: updated,
      jiraSync: jiraSyncResult,
      message: existing.jira_issue_key
        ? `Deadline updated and synced to Jira issue ${existing.jira_issue_key}.`
        : 'Deadline updated.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update action item';
    return NextResponse.json({ success: false, error: { code: 'UPDATE_FAILED', message: msg } }, { status: 500 });
  }
}
