'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Plus,
  Bell,
  ArrowUp,
  ExternalLink,
  MoreHorizontal,
  X,
  Trash2,
} from 'lucide-react';
import { useDashboard } from '@/lib/context/DashboardContext';
import { ActionItem } from '@/types/database';
import TaskDueDatePopover from '@/components/tasks/TaskDueDatePopover';

interface DisplayTask {
  id: string;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'synced_to_jira' | 'completed';
  assignee_name?: string | null;
  assignee_initials: string;
  assignee_avatar: string;
  reminded_on_slack?: boolean;
  due_date?: string | null;
  due_date_formatted: string;
  jira_issue_key?: string | null;
  jira_issue_url?: string | null;
  source_meeting_title?: string;
  source_meeting_id?: string;
}

export default function ActionItemsPage() {
  const {
    tasks,
    fetchTasks,
    tasksLoading,
    meetings,
    deleteTask,
    updateTaskDueDate,
    pushTaskToJira,
    pushAllTasksToJira,
  } = useDashboard();

  // Filter state
  const [activeTab, setActiveTab] = useState<'all' | 'waiting' | 'in_jira'>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Loading & status notification states
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
  const [sendingSlack, setSendingSlack] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete confirmation dialog
  const [taskToDelete, setTaskToDelete] = useState<DisplayTask | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal state for Add Action Item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    assignee_name: '',
    due_date: '',
    priority: 'high' as 'low' | 'medium' | 'high',
    meeting_id: '',
  });

  // Map meeting_id to meeting title
  const meetingTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    meetings.forEach((m) => {
      map.set(m.id, m.title);
    });
    return map;
  }, [meetings]);

  // Convert raw DB tasks into unified DisplayTask models (pure DB data, 0 mock)
  const displayTasks: DisplayTask[] = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    return tasks.map((dbTask: ActionItem, idx: number) => {
      const name = dbTask.assignee_name || null;
      let initials = '?';
      let avatarClass = 'avatar-gray';

      if (name) {
        const parts = name.trim().split(/\s+/);
        initials = parts.length > 1
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : name.slice(0, 2).toUpperCase();
        const colors = ['avatar-blue', 'avatar-purple', 'avatar-green', 'avatar-amber'];
        avatarClass = colors[idx % colors.length];
      }

      const dueDateFormatted = dbTask.due_date
        ? new Date(dbTask.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'No due date';

      return {
        id: dbTask.id,
        title: dbTask.title,
        description: dbTask.description || null,
        priority: (dbTask.priority as 'low' | 'medium' | 'high') || 'high',
        status:
          dbTask.status === 'completed'
            ? 'completed'
            : dbTask.jira_issue_key || dbTask.status === 'synced_to_jira'
            ? 'synced_to_jira'
            : 'pending',
        assignee_name: name,
        assignee_initials: initials,
        assignee_avatar: avatarClass,
        reminded_on_slack: false,
        due_date: dbTask.due_date || null,
        due_date_formatted: dueDateFormatted,
        jira_issue_key: dbTask.jira_issue_key || null,
        jira_issue_url: dbTask.jira_issue_url || null,
        source_meeting_title: meetingTitleMap.get(dbTask.meeting_id) || 'View source meeting',
        source_meeting_id: dbTask.meeting_id,
      };
    });
  }, [tasks, meetingTitleMap]);

  // Dynamic Metrics computed purely from real data
  const totalCount = displayTasks.length;
  const inJiraCount = displayTasks.filter((t) => t.status === 'synced_to_jira' || t.status === 'completed' || !!t.jira_issue_key).length;
  const waitingCount = displayTasks.filter((t) => t.status === 'pending').length;

  // 5-segment bar filled count
  const filledSegments = totalCount > 0 ? Math.round((inJiraCount / totalCount) * 5) : 0;

  // Filter pipeline
  const filteredTasks = useMemo(() => {
    return displayTasks.filter((item) => {
      // Tab filter
      if (activeTab === 'waiting' && item.status !== 'pending') return false;
      if (activeTab === 'in_jira' && item.status !== 'synced_to_jira' && item.status !== 'completed' && !item.jira_issue_key) return false;

      // Assignee dropdown filter
      if (selectedAssignee !== 'all') {
        if (selectedAssignee === 'unassigned') {
          if (item.assignee_name) return false;
        } else if (item.assignee_name !== selectedAssignee) {
          return false;
        }
      }

      // Priority dropdown filter
      if (selectedPriority !== 'all' && item.priority !== selectedPriority) {
        return false;
      }

      return true;
    });
  }, [displayTasks, activeTab, selectedAssignee, selectedPriority]);

  // Unique assignees for filter dropdown
  const uniqueAssignees = useMemo(() => {
    const names = new Set<string>();
    displayTasks.forEach((t) => {
      if (t.assignee_name) names.add(t.assignee_name);
    });
    return Array.from(names);
  }, [displayTasks]);

  // Push All Waiting to Jira
  const handlePushAllJira = async () => {
    try {
      setSyncingAll(true);
      setStatusMsg(null);
      const res = await pushAllTasksToJira();
      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: res.message || `Successfully pushed action items to Jira.`,
        });
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Failed to push to Jira.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Jira push error.' });
    } finally {
      setSyncingAll(false);
      setTimeout(() => setStatusMsg(null), 4500);
    }
  };

  // Push Single Task to Jira
  const handlePushSingleJira = async (task: DisplayTask) => {
    try {
      setSyncingItemId(task.id);
      setStatusMsg(null);
      const res = await pushTaskToJira(task.id);
      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: `Jira issue ${res.jiraKey} created for "${task.title}".`,
        });
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Failed to sync task' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to sync task' });
    } finally {
      setSyncingItemId(null);
      setTimeout(() => setStatusMsg(null), 4500);
    }
  };

  // Send Slack Reminders
  const handleSendSlackReminders = async () => {
    try {
      setSendingSlack(true);
      setStatusMsg(null);
      const res = await fetch('/api/cron/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg({
          type: 'success',
          text: `Reminders dispatched to Slack for pending action items.`,
        });
      } else {
        setStatusMsg({ type: 'error', text: json.error?.message || 'Failed to dispatch Slack reminders.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to dispatch Slack reminders.' });
    } finally {
      setSendingSlack(false);
      setTimeout(() => setStatusMsg(null), 4500);
    }
  };

  // Create New Action Item via Modal
  const handleCreateActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;

    try {
      setCreatingTask(true);
      const targetMeetingId = newTaskForm.meeting_id || meetings[0]?.id;
      if (!targetMeetingId) {
        setStatusMsg({ type: 'error', text: 'Please create or select a meeting first.' });
        return;
      }

      const res = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskForm.title,
          description: newTaskForm.description || undefined,
          assignee_name: newTaskForm.assignee_name || undefined,
          due_date: newTaskForm.due_date || undefined,
          priority: newTaskForm.priority,
          meeting_id: targetMeetingId,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to create action item');
      }

      setStatusMsg({ type: 'success', text: `Action item "${newTaskForm.title}" added.` });
      setIsModalOpen(false);
      setNewTaskForm({
        title: '',
        description: '',
        assignee_name: '',
        due_date: '',
        priority: 'high',
        meeting_id: '',
      });
      await fetchTasks();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create action item.' });
    } finally {
      setCreatingTask(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  // Delete Action Item
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      setIsDeleting(true);
      const res = await deleteTask(taskToDelete.id);
      if (res.success) {
        setStatusMsg({ type: 'success', text: `Deleted "${taskToDelete.title}".` });
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Failed to delete action item.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error deleting action item.' });
    } finally {
      setIsDeleting(false);
      setTaskToDelete(null);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  return (
    <div className="tasks-view-container">
      {/* 1. Header Section */}
      <div className="tasks-header-section">
        <h1 className="tasks-header-title">Action items</h1>
        <p className="tasks-header-subtitle">
          Commitments pulled from your meetings, assigned to people and synced to Jira Cloud.
        </p>

        {/* Action Toolbar */}
        <div className="tasks-action-toolbar">
          <button
            type="button"
            onClick={() => fetchTasks()}
            title="Refresh action items"
            className="tasks-btn-icon"
          >
            <RefreshCw size={14} className={tasksLoading ? 'dash-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="tasks-btn-glass"
          >
            <Plus size={14} />
            <span>Add action item</span>
          </button>

          <button
            type="button"
            onClick={handleSendSlackReminders}
            disabled={sendingSlack || waitingCount === 0}
            className="tasks-btn-glass"
          >
            <Bell size={14} />
            <span>{sendingSlack ? 'Sending...' : 'Send Slack reminders'}</span>
          </button>

          <button
            type="button"
            onClick={handlePushAllJira}
            disabled={syncingAll || waitingCount === 0}
            className="tasks-btn-primary"
          >
            <ArrowUp size={14} />
            <span>
              {syncingAll
                ? 'Pushing...'
                : waitingCount > 0
                ? `Push ${waitingCount} to Jira`
                : 'All in Jira'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Notification Toast */}
      {statusMsg && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '0.825rem',
            background:
              statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border:
              statusMsg.type === 'success'
                ? '1px solid rgba(16, 185, 129, 0.25)'
                : '1px solid rgba(239, 68, 68, 0.25)',
            color: statusMsg.type === 'success' ? '#34D399' : '#F87171',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* 3. Segmented Progress Bar */}
      <div className="tasks-progress-row">
        <div className="tasks-segmented-bar">
          {[0, 1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className={`tasks-segment-pill ${idx < filledSegments ? 'filled' : ''}`}
            />
          ))}
        </div>
        <span className="tasks-progress-text">
          {totalCount > 0
            ? `${inJiraCount} of ${totalCount} are in Jira. ${waitingCount} are waiting to sync.`
            : '0 action items yet. They will be extracted automatically from meetings or you can add one manually.'}
        </span>
      </div>

      {/* 4. Filter Navigation Row */}
      <div className="tasks-filter-row">
        {/* Left Tabs */}
        <div className="tasks-nav-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`tasks-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          >
            All {totalCount}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('waiting')}
            className={`tasks-tab-btn ${activeTab === 'waiting' ? 'active' : ''}`}
          >
            Waiting to sync {waitingCount}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('in_jira')}
            className={`tasks-tab-btn ${activeTab === 'in_jira' ? 'active' : ''}`}
          >
            In Jira {inJiraCount}
          </button>
        </div>

        {/* Right Dropdown Selects */}
        <div className="tasks-filter-dropdowns">
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="tasks-select-pill"
          >
            <option value="all">All assignees</option>
            {uniqueAssignees.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="unassigned">Unassigned</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="tasks-select-pill"
          >
            <option value="all">All priorities</option>
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
        </div>
      </div>

      {/* 5. Main Action Items Table Card */}
      <div className="tasks-table-card">
        {/* Table Header */}
        <div className="tasks-grid-header">
          <span />
          <span>Task</span>
          <span>Assignee</span>
          <span>Due</span>
          <span>Jira</span>
          <span />
        </div>

        {/* Rows List */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const isCompleted = task.status === 'completed';
              const isSynced = task.status === 'synced_to_jira' || isCompleted;
              const isSyncingThis = syncingItemId === task.id;

              return (
                <div key={task.id} className="tasks-grid-row">
                  {/* Col 0: Status Circle Icon */}
                  <div>
                    {isSynced ? (
                      <div
                        className="tasks-circle-checked"
                        style={isCompleted ? { background: '#10B981', borderColor: '#059669' } : {}}
                        title={isCompleted ? 'Completed in Jira' : 'Synced to Jira'}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : (
                      <div className="tasks-circle-empty" />
                    )}
                  </div>

                  {/* Col 1: Task Title, Priority, Description, Source Meeting Link */}
                  <div className="tasks-info-block">
                    <div className="tasks-title-row">
                      <span
                        className="tasks-title-text"
                        style={isCompleted ? { textDecoration: 'line-through', opacity: 0.65 } : {}}
                      >
                        {task.title}
                      </span>
                      {isCompleted ? (
                        <span
                          className="tasks-priority-pill"
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34D399',
                            borderColor: 'rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          Done in Jira
                        </span>
                      ) : (
                        <span className={`tasks-priority-pill tasks-priority-${task.priority}`}>
                          {task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low'}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="tasks-desc-text">{task.description}</p>
                    )}

                    {task.source_meeting_id && (
                      <div>
                        <Link
                          href={`/meetings/${task.source_meeting_id}`}
                          className="tasks-source-link"
                        >
                          {task.source_meeting_title}
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Col 2: Assignee Avatar, Name, Slack Reminded */}
                  <div className="tasks-assignee-block">
                    <div className={`tasks-assignee-avatar ${task.assignee_avatar}`}>
                      {task.assignee_initials}
                    </div>
                    <div className="tasks-assignee-meta">
                      <span className={`tasks-assignee-name ${!task.assignee_name ? 'tasks-due-muted' : ''}`}>
                        {task.assignee_name || 'Unassigned'}
                      </span>
                      {task.reminded_on_slack && (
                        <span className="tasks-assignee-sub">Reminded on Slack</span>
                      )}
                    </div>
                  </div>

                  {/* Col 3: Due Date (P1 1-Click Inline Popover with P2 Real-Time Jira Sync) */}
                  <div>
                    <TaskDueDatePopover
                      taskId={task.id}
                      currentDueDate={task.due_date || null}
                      onUpdate={async (taskId, newDate) => {
                        const res = await updateTaskDueDate(taskId, newDate);
                        if (res.message) {
                          setStatusMsg({
                            type: res.success ? 'success' : 'error',
                            text: res.message,
                          });
                          setTimeout(() => setStatusMsg(null), 5000);
                        }
                      }}
                    />
                  </div>

                  {/* Col 4: Jira Action Button OR Issue Key Pill */}
                  <div className="tasks-jira-cell">
                    {isSynced && task.jira_issue_key ? (
                      <a
                        href={task.jira_issue_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tasks-jira-pill"
                      >
                        <span>{task.jira_issue_key}</span>
                        <ExternalLink size={11} />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePushSingleJira(task)}
                        disabled={isSyncingThis}
                        className="tasks-btn-push-single"
                      >
                        {isSyncingThis ? 'Pushing...' : 'Push to Jira'}
                      </button>
                    )}
                  </div>

                  {/* Col 5: Trailing Actions: Delete */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setTaskToDelete(task)}
                      title="Delete action item"
                      className="tasks-row-menu-btn"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#A3ACC0', fontSize: '14px' }}>
              {totalCount === 0 ? (
                <div>
                  <p style={{ marginBottom: '16px' }}>No action items yet.</p>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="dash-btn-primary"
                    style={{ margin: '0 auto' }}
                  >
                    <Plus size={14} />
                    <span>Add action item</span>
                  </button>
                </div>
              ) : (
                'No action items match the current filter.'
              )}
            </div>
          )}
        </div>
      </div>

      {/* 6. Modal for Add Action Item */}
      {isModalOpen && (
        <div className="tasks-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="tasks-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="tasks-modal-title">Add Action Item</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="tasks-row-menu-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateActionItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', color: '#94A3B8', marginBottom: '6px' }}>
                  Commitment / Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verify database schema migration"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="tasks-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', color: '#94A3B8', marginBottom: '6px' }}>
                  Source Meeting *
                </label>
                <select
                  required
                  value={newTaskForm.meeting_id || (meetings[0]?.id || '')}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, meeting_id: e.target.value })}
                  className="tasks-input"
                >
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                  {meetings.length === 0 && <option value="">No meetings available</option>}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', color: '#94A3B8', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional context extracted from dialogue..."
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  className="tasks-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.775rem', color: '#94A3B8', marginBottom: '6px' }}>
                    Assignee Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={newTaskForm.assignee_name}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, assignee_name: e.target.value })}
                    className="tasks-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.775rem', color: '#94A3B8', marginBottom: '6px' }}>
                    Priority
                  </label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="tasks-input"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', color: '#94A3B8', marginBottom: '6px' }}>
                  Due Date
                </label>
                <input
                  type="date"
                  value={newTaskForm.due_date}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, due_date: e.target.value })}
                  className="tasks-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="tasks-btn-glass"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask || !newTaskForm.title.trim()}
                  className="tasks-btn-primary"
                >
                  {creatingTask ? 'Adding...' : 'Create Action Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Dialog */}
      {taskToDelete && (
        <div className="tasks-modal-overlay" onClick={() => setTaskToDelete(null)}>
          <div className="tasks-modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="tasks-modal-title" style={{ color: '#F87171' }}>Delete Action Item</h3>
            <p style={{ color: '#A3ACC0', fontSize: '14px', margin: '12px 0 20px 0', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>&ldquo;{taskToDelete.title}&rdquo;</strong>? This action will remove it from the database and all reports.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="tasks-btn-glass"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="dash-btn-primary"
                style={{ background: '#EF4444' }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
