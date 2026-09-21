'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActionItem, Reminder } from '@/types/database';
import { useDashboard } from '@/lib/context/DashboardContext';
import {
  CheckSquare,
  RefreshCw,
  ExternalLink,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Bell,
  Plus,
  Trash2,
  X,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

export default function TaskTrackerPage() {
  const { tasks, tasksLoading: loading, fetchTasks, meetings } = useDashboard();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'synced'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Action Item Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    meeting_id: '',
    title: '',
    description: '',
    assignee_name: '',
    assignee_email: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const fetchReminders = useCallback(async () => {
    try {
      const res = await fetch('/api/cron/reminders');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setReminders(json.data);
      }
    } catch (err) {
      console.warn('Error fetching reminders:', err);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleSyncSingle = async (actionItemId: string) => {
    try {
      setSyncingId(actionItemId);
      setStatusMessage(null);
      const res = await fetch('/api/integrations/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_item_id: actionItemId }),
      });
      const json = await res.json();
      if (json.success) {
        const issueKey = json.data && json.data[0]?.jira_issue_key;
        setStatusMessage({
          type: 'success',
          text: issueKey ? `Jira issue ${issueKey} created successfully` : 'Task synced to Jira Cloud.',
        });
        await fetchTasks();
      } else {
        setStatusMessage({ type: 'error', text: json.error?.message || 'Failed to sync with Jira.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error communicating with Jira Cloud.' });
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      setStatusMessage(null);
      const res = await fetch('/api/integrations/jira', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: 'success', text: `Successfully created ${json.count} Jira issue(s)` });
        await fetchTasks();
      } else {
        setStatusMessage({ type: 'error', text: json.error?.message || 'Failed to push tasks to Jira.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error syncing tasks.' });
    } finally {
      setSyncingAll(false);
    }
  };

  const handleDeleteTask = async (actionItemId: string) => {
    try {
      setDeletingId(actionItemId);
      setStatusMessage(null);
      const res = await fetch(`/api/action-items?id=${actionItemId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: 'success', text: 'Action item removed.' });
        await fetchTasks();
      } else {
        setStatusMessage({ type: 'error', text: json.error?.message || 'Failed to delete action item.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error deleting task.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;

    try {
      setCreatingTask(true);
      setStatusMessage(null);
      const res = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTaskForm,
          meeting_id: newTaskForm.meeting_id || meetings[0]?.id || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: 'success', text: `Action item "${newTaskForm.title}" created.` });
        setIsModalOpen(false);
        setNewTaskForm({
          meeting_id: '',
          title: '',
          description: '',
          assignee_name: '',
          assignee_email: '',
          due_date: '',
          priority: 'medium',
        });
        await fetchTasks();
      } else {
        setStatusMessage({ type: 'error', text: json.error?.message || 'Failed to create task.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error creating action item.' });
    } finally {
      setCreatingTask(false);
    }
  };

  const [triggeringReminders, setTriggeringReminders] = useState(false);

  const handleTriggerReminders = async () => {
    try {
      setTriggeringReminders(true);
      setStatusMessage(null);
      const res = await fetch('/api/cron/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({
          type: 'success',
          text: `Meeting summary broadcasted to #meeting-summaries on Slack (${json.data?.remindersSent || 0} alert(s) dispatched)`,
        });
        await Promise.all([fetchTasks(), fetchReminders()]);
      } else {
        setStatusMessage({ type: 'error', text: json.error?.message || 'Failed to evaluate reminders.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error evaluating reminders.' });
    } finally {
      setTriggeringReminders(false);
      setTimeout(() => setStatusMessage(null), 6000);
    }
  };

  // Assignee list for dropdown
  const uniqueAssignees = Array.from(
    new Set(tasks.map((t) => t.assignee_name).filter(Boolean))
  ) as string[];

  // Filter pipeline
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'pending' && t.status !== 'pending') return false;
    if (statusFilter === 'synced' && t.status !== 'synced_to_jira') return false;
    if (assigneeFilter !== 'all' && t.assignee_name !== assigneeFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const syncedCount = tasks.filter((t) => t.status === 'synced_to_jira').length;

  // Check if due date is < 24 hours away
  const isDueSoon = (dateStr: string | null) => {
    if (!dateStr) return false;
    const dueTime = new Date(dateStr).getTime();
    const now = Date.now();
    const diffHours = (dueTime - now) / (1000 * 60 * 60);
    return diffHours >= -24 && diffHours <= 24;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--blue-bg)',
                border: '1px solid rgba(62, 142, 247, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--blue)',
              }}
            >
              <CheckSquare size={20} />
            </div>
            <h1 className="type-h1" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Action Items &amp; Jira Tracker
            </h1>
          </div>
          <p className="prose-limit" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Extracted meeting commitments automatically mapped to assignees and synced to Jira Cloud.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} className="icon-hover-rotate" /> Add Action Item
          </button>
          <button
            onClick={() => fetchTasks()}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={13} className={loading ? 'status-dot-pulse' : 'icon-hover-rotate'} /> Refresh
          </button>
          <button
            onClick={handleTriggerReminders}
            disabled={triggeringReminders}
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--status-warning)', borderColor: 'rgba(232, 151, 60, 0.3)' }}
          >
            <Bell size={13} className={triggeringReminders ? 'status-dot-pulse' : 'icon-hover-bounce'} />
            {triggeringReminders ? 'Evaluating...' : 'Send Slack Reminders'}
          </button>
          {pendingCount > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              className="btn btn-primary btn-sm"
            >
              <ArrowUpRight size={14} className="icon-hover-arrow" />
              {syncingAll ? 'Pushing to Jira...' : `Push All to Jira (${pendingCount})`}
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          className={`badge ${statusMessage.type === 'success' ? 'badge-success' : 'badge-danger'}`}
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            lineHeight: 1.4,
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Metrics Row (3 Cards with Space Grotesk hierarchy) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <div className="card card-interactive" style={{ padding: 'var(--space-4) var(--space-5)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          <div className="type-caption" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-1)', fontWeight: 600, letterSpacing: '0.05em' }}>
            TOTAL EXTRACTED
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
            {tasks.length}
          </div>
          <div className="type-caption" style={{ color: 'var(--text-secondary)' }}>From meeting transcript dialogues</div>
        </div>

        <div className="card card-interactive" style={{ padding: 'var(--space-4) var(--space-5)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid rgba(232, 151, 60, 0.25)' }}>
          <div className="type-caption" style={{ color: 'var(--status-warning)', marginBottom: 'var(--space-1)', fontWeight: 600, letterSpacing: '0.05em' }}>
            PENDING JIRA SYNC
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 600, color: 'var(--status-warning)', marginBottom: 'var(--space-1)' }}>
            {pendingCount}
          </div>
          <div className="type-caption" style={{ color: 'var(--text-secondary)' }}>Awaiting one-click export</div>
        </div>

        <div className="card card-interactive" style={{ padding: 'var(--space-4) var(--space-5)', borderRadius: 'var(--radius-md)', background: 'linear-gradient(180deg, rgba(242, 185, 77, 0.04) 0%, var(--bg-card) 100%)', border: '1px solid rgba(242, 185, 77, 0.25)' }}>
          <div className="type-caption" style={{ color: 'var(--gold)', marginBottom: 'var(--space-1)', fontWeight: 600, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="node-gold-dot" /> SYNCED TO JIRA
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 600, color: 'var(--gold)', marginBottom: 'var(--space-1)' }}>
            {syncedCount}
          </div>
          <div className="type-caption" style={{ color: 'var(--text-secondary)' }}>Active issues in Atlassian backlog</div>
        </div>
      </div>

      {/* Filter Bar (Meeting, Assignee, Status, Priority) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 'var(--space-3)',
        }}
      >
        {/* Status Tab Group */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            onClick={() => setStatusFilter('all')}
            className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`btn btn-sm ${statusFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Pending Sync ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('synced')}
            className={`btn btn-sm ${statusFilter === 'synced' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Synced in Jira ({syncedCount})
          </button>
        </div>

        {/* Dropdown Filters (Assignee & Priority) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="input-field"
            style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
          >
            <option value="all">All Assignees</option>
            {uniqueAssignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input-field"
            style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Task List / Empty State */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="card skeleton-shimmer" style={{ height: '110px' }} />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        /* Empty State strictly per Spec: exact text */
        <div
          className="card"
          style={{
            padding: 'var(--space-10) var(--space-6)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
            border: '1px dashed var(--border-default)',
          }}
        >
          <CheckSquare size={38} color="var(--text-muted)" style={{ opacity: 0.6 }} />
          <h3 className="type-h3">No action items yet</h3>
          <p className="prose-limit" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            No action items yet — they&apos;ll show up here automatically after your next synced meeting.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> Add Action Item
            </button>
            <Link href="/meetings" className="btn btn-secondary btn-sm">
              View Meetings
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filteredTasks.map((t) => {
            const isSynced = t.status === 'synced_to_jira' && t.jira_issue_key;
            const isSyncing = syncingId === t.id;
            const isDeleting = deletingId === t.id;
            const dueAlert = isDueSoon(t.due_date);

            return (
              <div
                key={t.id}
                className="card card-interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4) var(--space-5)',
                  border: isSynced ? '1px solid rgba(242, 185, 77, 0.25)' : '1px solid var(--border-default)',
                  background: isSynced ? 'linear-gradient(180deg, rgba(242, 185, 77, 0.03) 0%, var(--bg-card) 100%)' : 'var(--bg-card)',
                  borderLeft: isSynced ? '3px solid var(--gold)' : '3px solid rgba(232, 151, 60, 0.5)',
                  opacity: isDeleting ? 0.4 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)', flexWrap: 'wrap' }}>
                      {isSynced ? (
                        <span className="node-gold-dot" title="Synced to Jira" />
                      ) : (
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            border: '1.5px solid var(--border-default)',
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                          title="Pending Jira sync"
                        />
                      )}
                      <strong className="text-title-interactive" style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {t.title}
                      </strong>
                      <span
                        className={`badge ${
                          t.priority === 'high'
                            ? 'badge-warning'
                            : 'badge-secondary'
                        }`}
                        style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}
                      >
                        {t.priority}
                      </span>
                      {reminders.some((r) => r.action_item_id === t.id) && (
                        <span className="badge" style={{ fontSize: '0.65rem', background: 'var(--gold-bg)', color: 'var(--gold)', border: '1px solid rgba(242, 185, 77, 0.25)' }}>
                          <Bell size={10} className="icon-hover-bounce" /> Slack Reminder Sent
                        </span>
                      )}
                    </div>

                    {t.description && (
                      <p className="prose-limit" style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 'var(--space-1) 0' }}>
                        {t.description}
                      </p>
                    )}
                  </div>

                  {/* Actions (Semantic Jira Badge or Push to Jira Button) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {isSynced ? (
                      <a
                        href={t.jira_issue_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="badge-resolved"
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.3rem 0.6rem',
                          fontFamily: 'var(--font-mono, monospace)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 'var(--space-1)',
                          textDecoration: 'none',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Jira</span>
                        <span>{t.jira_issue_key}</span>
                        <ExternalLink size={10} color="var(--gold)" />
                      </a>
                    ) : (
                      <button
                        onClick={() => handleSyncSingle(t.id)}
                        disabled={isSyncing}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.75rem' }}
                      >
                        <span className={isSyncing ? 'node-pulse-dot' : ''} />
                        {!isSyncing && <ArrowUpRight size={12} />}
                        {isSyncing ? 'Pushing...' : 'Push to Jira'}
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      disabled={isDeleting}
                      title="Delete action item"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.35rem', color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={13} className="icon-hover-rotate" />
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 'var(--space-3)',
                    paddingTop: 'var(--space-2)',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                    <Users size={13} color="var(--blue)" />
                    <strong>Assignee:</strong> {t.assignee_name || 'Unassigned'}
                    {t.assignee_email && ` (${t.assignee_email})`}
                  </span>

                  {/* Amber pill if < 24h per Spec */}
                  <span
                    className={dueAlert ? 'badge badge-warning' : ''}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
                  >
                    <Calendar size={13} color={dueAlert ? 'var(--status-warning)' : 'var(--text-muted)'} />
                    <strong>Due:</strong>{' '}
                    {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No deadline'}
                    {dueAlert && ' (due soon)'}
                  </span>

                  {t.meeting_id && (
                    <Link
                      href={`/meetings/${t.meeting_id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--cyan)', textDecoration: 'none' }}
                    >
                      View Source Meeting <ExternalLink size={10} color="var(--cyan)" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Action Item */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'var(--glass-blur)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              boxShadow: 'var(--shadow-3)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <CheckSquare size={20} color="var(--primary)" />
                <h2 className="type-h2">Create New Action Item</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.5rem' }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                  Associated Meeting
                </label>
                <select
                  value={newTaskForm.meeting_id}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, meeting_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select a meeting...</option>
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({new Date(m.start_time).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement OAuth token refresh flow"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Detailed commitment notes, technical specs, or deliverables..."
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                    Assignee Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajiv Chaurasiya"
                    value={newTaskForm.assignee_name}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, assignee_name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                    Assignee Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. rajiv@example.com"
                    value={newTaskForm.assignee_email}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, assignee_email: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                    Priority
                  </label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="input-field"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTaskForm.due_date}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, due_date: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="btn btn-primary btn-sm"
                >
                  {creatingTask ? 'Saving Task...' : 'Create Action Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
