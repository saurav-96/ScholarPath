import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  ExternalLink,
  Info,
  ListChecks,
  Plus,
  Square,
  Trash2,
} from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Badge,
  Button,
  Card,
  Input,
  ProgressBar,
  Select,
  Textarea,
} from '@/components/ui/Primitives';
import { useToast } from '@/contexts/ToastContext';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import { daysUntilDate, formatDeadlineDisplay } from '@/lib/dates';
import { generateId } from '@/lib/utils';
import type { ApplicationStatus, ApplicationTask, TrackedApplication } from '@/types/domain';

const STATUS_OPTIONS: Array<{
  value: ApplicationStatus;
  label: string;
  badgeVariant: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}> = [
  { value: 'interested', label: 'Interested', badgeVariant: 'default' },
  { value: 'researching', label: 'Researching', badgeVariant: 'primary' },
  { value: 'preparing_documents', label: 'Preparing Documents', badgeVariant: 'warning' },
  { value: 'ready_to_apply', label: 'Ready to Apply', badgeVariant: 'secondary' },
  { value: 'submitted', label: 'Submitted', badgeVariant: 'primary' },
  { value: 'interview', label: 'Interview', badgeVariant: 'secondary' },
  { value: 'accepted', label: 'Accepted', badgeVariant: 'success' },
  { value: 'rejected', label: 'Rejected', badgeVariant: 'error' },
  { value: 'withdrawn', label: 'Withdrawn', badgeVariant: 'default' },
];

export function ApplicationsPage() {
  const { scholarships, universities, countries } = useCatalogData();
  const { userState, upsertApplication, deleteApplication } = useUserWorkspace();
  const { pushToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'ALL' | ApplicationStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrackedApplication | null>(null);

  // Per-application local task input & notes drafts
  const [newTaskDrafts, setNewTaskDrafts] = useState<
    Record<string, { title: string; priority: 'low' | 'medium' | 'high'; dueDate: string }>
  >({});
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});

  // New application form state
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string>('');
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('');
  const [customTitle, setCustomTitle] = useState('');
  const [universityName, setUniversityName] = useState('');
  const [countryCode, setCountryCode] = useState('IT');
  const [initialStatus, setInitialStatus] = useState<ApplicationStatus>('interested');
  const [deadlineInput, setDeadlineInput] = useState('');
  const [initialNotes, setInitialNotes] = useState('');

  const applications = useMemo(
    () => userState?.applications ?? [],
    [userState?.applications],
  );

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return applications.filter((app) => {
      if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
      if (q) {
        const hay = `${app.customTitle} ${app.universityName} ${app.countryCode} ${app.personalNotes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [applications, statusFilter, searchQuery]);

  const progressSummary = useMemo(() => {
    const total = applications.length;
    const activeCount = applications.filter(
      (a) => !['rejected', 'withdrawn'].includes(a.status),
    ).length;
    const submittedOrLater = applications.filter((a) =>
      ['submitted', 'interview', 'accepted'].includes(a.status),
    ).length;
    const allTasks = applications.flatMap((a) => a.tasks);
    const doneTasks = allTasks.filter((t) => t.completed).length;
    const taskRate = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;

    return { total, activeCount, submittedOrLater, allTasksCount: allTasks.length, doneTasks, taskRate };
  }, [applications]);

  function handleScholarshipSelect(id: string) {
    setSelectedScholarshipId(id);
    if (!id) return;
    const sch = scholarships.find((s) => s.id === id);
    if (!sch) return;
    setCustomTitle(sch.name);
    setCountryCode(sch.countryCode);
    if (sch.universityId) {
      setSelectedUniversityId(sch.universityId);
      const uni = universities.find((u) => u.id === sch.universityId);
      setUniversityName(uni?.name ?? sch.institutionDisplay);
    } else {
      setUniversityName(sch.institutionDisplay);
    }
    if (sch.applicationDeadline) {
      setDeadlineInput(sch.applicationDeadline);
    }
  }

  function handleUniversitySelect(id: string) {
    setSelectedUniversityId(id);
    const uni = universities.find((u) => u.id === id);
    if (uni) {
      setUniversityName(uni.name);
      setCountryCode(uni.countryCode);
      if (!customTitle) {
        setCustomTitle(`Bachelor Admission — ${uni.name}`);
      }
    }
  }

  async function handleCreateApplication(e: React.FormEvent) {
    e.preventDefault();
    if (!customTitle.trim() || !universityName.trim()) {
      pushToast({
        title: 'Title and institution required',
        description: 'Enter an application title and university or provider name.',
        variant: 'warning',
      });
      return;
    }

    const sch = scholarships.find((s) => s.id === selectedScholarshipId);
    const defaultTasks: ApplicationTask[] = (sch?.requiredDocuments ?? [])
      .slice(0, 3)
      .map((docTitle) => ({
        id: generateId('task'),
        title: `Prepare ${docTitle}`,
        dueDate: deadlineInput || null,
        completed: false,
        priority: 'medium',
      }));

    if (defaultTasks.length === 0) {
      defaultTasks.push({
        id: generateId('task'),
        title: 'Confirm official portal deadlines and document list',
        dueDate: deadlineInput || null,
        completed: false,
        priority: 'high',
      });
    }

    const newApp: TrackedApplication = {
      id: generateId('app'),
      scholarshipId: selectedScholarshipId || null,
      universityId: selectedUniversityId || null,
      customTitle: customTitle.trim(),
      universityName: universityName.trim(),
      countryCode,
      status: initialStatus,
      deadline: deadlineInput || null,
      submissionDate: initialStatus === 'submitted' ? new Date().toISOString().slice(0, 10) : null,
      personalNotes: initialNotes.trim(),
      tasks: defaultTasks,
      updatedAt: new Date().toISOString(),
    };

    await upsertApplication(newApp);
    pushToast({ title: 'Application added to your tracker', variant: 'success' });
    setAddModalOpen(false);
    setSelectedScholarshipId('');
    setSelectedUniversityId('');
    setCustomTitle('');
    setUniversityName('');
    setDeadlineInput('');
    setInitialNotes('');
    setInitialStatus('interested');
  }

  async function handleUpdateApp(app: TrackedApplication, patch: Partial<TrackedApplication>) {
    await upsertApplication({
      ...app,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  async function handleToggleTask(app: TrackedApplication, taskId: string) {
    const nextTasks = app.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t,
    );
    await handleUpdateApp(app, { tasks: nextTasks });
  }

  async function handleAddTask(app: TrackedApplication) {
    const draft = newTaskDrafts[app.id];
    const title = draft?.title.trim() ?? '';
    if (!title) return;

    const newTask: ApplicationTask = {
      id: generateId('task'),
      title,
      dueDate: draft?.dueDate || null,
      completed: false,
      priority: draft?.priority || 'medium',
    };
    await handleUpdateApp(app, { tasks: [...app.tasks, newTask] });
    setNewTaskDrafts((prev) => ({
      ...prev,
      [app.id]: { title: '', priority: 'medium', dueDate: '' },
    }));
    pushToast({ title: 'Checklist task added', variant: 'success' });
  }

  async function handleDeleteTask(app: TrackedApplication, taskId: string) {
    await handleUpdateApp(app, { tasks: app.tasks.filter((t) => t.id !== taskId) });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title="Application Tracker"
        description="Track personal scholarship and bachelor admissions statuses, deadlines, and preparation checklists."
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            Personal Application Tracker
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Track stages from Interested to Accepted, maintain preparation tasks, and stay ahead of
            deadlines.
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Track New Application
        </Button>
      </div>

      {/* Explicit Personal Tracker Disclaimer */}
      <Card className="mt-5 border-accent-primary/30 bg-accent-primary/5 py-3.5">
        <div className="flex items-start gap-2.5 text-xs text-text-secondary">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" />
          <p>
            <strong className="text-text-primary">Personal planning tracker only:</strong> Updating a
            status here organizes your own schedule and does <strong>not</strong> submit files to or
            notify any university or government agency. Always complete final submissions on each
            official application portal.
          </p>
        </div>
      </Card>

      {/* Progress Overview */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-text-muted">Tracked Applications</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{progressSummary.total}</p>
          <p className="mt-1 text-xs text-text-secondary">
            {progressSummary.activeCount} active pipeline entries
          </p>
        </Card>
        <Card>
          <p className="text-xs text-text-muted">Submitted / Post-Submission</p>
          <p className="mt-1 text-2xl font-bold text-accent-secondary">
            {progressSummary.submittedOrLater}
          </p>
          <p className="mt-1 text-xs text-text-secondary">Submitted, Interview, or Accepted</p>
        </Card>
        <Card className="sm:col-span-2">
          <ProgressBar
            value={progressSummary.taskRate}
            label={`Checklist Task Readiness (${progressSummary.doneTasks}/${progressSummary.allTasksCount} completed)`}
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((st) => {
              const count = applications.filter((a) => a.status === st.value).length;
              if (count === 0) return null;
              return (
                <Badge key={st.value} variant={st.badgeVariant}>
                  {st.label}: {count}
                </Badge>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracked applications, universities, or notes..."
            aria-label="Search tracked applications"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ApplicationStatus)}
          className="w-full sm:w-56"
          aria-label="Filter by status"
        >
          <option value="ALL">All Statuses ({applications.length})</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} ({applications.filter((a) => a.status === opt.value).length})
            </option>
          ))}
        </Select>
      </div>

      {/* Application Cards */}
      <div className="mt-6 space-y-5">
        {filteredApplications.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="h-6 w-6" />}
            title="No applications match this filter"
            description="Add a scholarship or bachelor university admission to start managing your personal checklist and dates."
            actionLabel="Track New Application"
            onAction={() => setAddModalOpen(true)}
          />
        ) : (
          filteredApplications.map((app) => {
            const linkedSch = scholarships.find((s) => s.id === app.scholarshipId);
            const linkedUni = universities.find((u) => u.id === app.universityId);
            const completedCount = app.tasks.filter((t) => t.completed).length;
            const taskPct =
              app.tasks.length > 0 ? Math.round((completedCount / app.tasks.length) * 100) : 0;
            const daysLeft = daysUntilDate(app.deadline);
            const statusMeta = STATUS_OPTIONS.find((s) => s.value === app.status);
            const draftTask = newTaskDrafts[app.id] ?? {
              title: '',
              priority: 'medium' as const,
              dueDate: '',
            };
            const currentNotes = notesDrafts[app.id] ?? app.personalNotes;

            return (
              <Card key={app.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusMeta?.badgeVariant ?? 'default'}>
                        {statusMeta?.label ?? app.status}
                      </Badge>
                      <Badge variant="outline">{app.countryCode}</Badge>
                      {daysLeft !== null && (
                        <Badge
                          variant={
                            daysLeft < 0 ? 'error' : daysLeft <= 21 ? 'warning' : 'secondary'
                          }
                        >
                          {daysLeft < 0
                            ? `${Math.abs(daysLeft)}d past deadline`
                            : `${daysLeft}d remaining`}
                        </Badge>
                      )}
                    </div>

                    <h2 className="font-display text-lg font-bold text-text-primary">
                      {app.customTitle}
                    </h2>
                    <p className="text-sm text-text-secondary">{app.universityName}</p>
                    <div className="flex flex-wrap gap-3 pt-1 text-xs">
                      {linkedSch && (
                        <Link
                          to={`/scholarships/${linkedSch.slug}`}
                          className="inline-flex items-center gap-1 text-accent-primary hover:underline"
                        >
                          View Scholarship Details <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                      {linkedUni && (
                        <Link
                          to={`/universities/${linkedUni.slug}`}
                          className="inline-flex items-center gap-1 text-accent-secondary hover:underline"
                        >
                          View University Profile <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                      <Link
                        to="/documents"
                        className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary hover:underline"
                      >
                        Manage Documents
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      aria-label={`Status for ${app.customTitle}`}
                      value={app.status}
                      onChange={async (e) => {
                        const nextStatus = e.target.value as ApplicationStatus;
                        await handleUpdateApp(app, {
                          status: nextStatus,
                          submissionDate:
                            nextStatus === 'submitted' && !app.submissionDate
                              ? new Date().toISOString().slice(0, 10)
                              : app.submissionDate,
                        });
                        pushToast({
                          title: `Updated stage to ${STATUS_OPTIONS.find((s) => s.value === nextStatus)?.label}`,
                          variant: 'success',
                        });
                      }}
                      className="h-9 w-48 text-xs"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>

                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${app.customTitle}`}
                      onClick={() => setDeleteTarget(app)}
                    >
                      <Trash2 className="h-4 w-4 text-status-error" />
                    </Button>
                  </div>
                </div>

                {/* Important Dates & Notes Row */}
                <div className="grid gap-4 border-y border-border-subtle py-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">
                      Target / Official Deadline
                    </label>
                    <Input
                      type="date"
                      value={app.deadline ?? ''}
                      onChange={(e) =>
                        handleUpdateApp(app, { deadline: e.target.value || null })
                      }
                      className="h-9 text-xs"
                    />
                    {app.deadline && (
                      <p className="mt-1 text-[11px] text-text-muted">
                        Display: {formatDeadlineDisplay(app.deadline)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">
                      Submission Date (Personal Record)
                    </label>
                    <Input
                      type="date"
                      value={app.submissionDate ?? ''}
                      onChange={(e) =>
                        handleUpdateApp(app, { submissionDate: e.target.value || null })
                      }
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">
                      Personal Notes
                    </label>
                    <div className="flex gap-2">
                      <Textarea
                        value={currentNotes}
                        onChange={(e) =>
                          setNotesDrafts((prev) => ({ ...prev, [app.id]: e.target.value }))
                        }
                        placeholder="Portal login reminders, fee waiver notes, referee status..."
                        className="min-h-[60px] text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="self-end"
                        onClick={async () => {
                          await handleUpdateApp(app, { personalNotes: currentNotes });
                          pushToast({ title: 'Notes saved', variant: 'success' });
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Task Checklist */}
                <div className="space-y-3">
                  <ProgressBar
                    value={taskPct}
                    label={`Preparation Checklist (${completedCount}/${app.tasks.length})`}
                  />

                  <ul className="space-y-2">
                    {app.tasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-bg-secondary/60 px-3 py-2 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleTask(app, task.id)}
                          className="flex flex-1 items-center gap-2.5 text-left"
                        >
                          {task.completed ? (
                            <CheckSquare className="h-4 w-4 shrink-0 text-status-success" />
                          ) : (
                            <Square className="h-4 w-4 shrink-0 text-text-muted" />
                          )}
                          <span
                            className={
                              task.completed
                                ? 'text-text-muted line-through'
                                : 'font-medium text-text-primary'
                            }
                          >
                            {task.title}
                          </span>
                        </button>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              task.priority === 'high'
                                ? 'error'
                                : task.priority === 'medium'
                                  ? 'warning'
                                  : 'default'
                            }
                          >
                            {task.priority}
                          </Badge>
                          {task.dueDate && (
                            <span className="font-mono text-[11px] text-text-muted">
                              {task.dueDate}
                            </span>
                          )}
                          <button
                            type="button"
                            aria-label={`Remove task ${task.title}`}
                            onClick={() => handleDeleteTask(app, task.id)}
                            className="rounded p-1 text-text-muted hover:text-status-error"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Input
                      value={draftTask.title}
                      onChange={(e) =>
                        setNewTaskDrafts((prev) => ({
                          ...prev,
                          [app.id]: { ...draftTask, title: e.target.value },
                        }))
                      }
                      placeholder="Add preparation task (e.g., Apostille high school transcript)..."
                      aria-label={`New task for ${app.customTitle}`}
                      className="h-9 min-w-[220px] flex-1 text-xs"
                    />
                    <Select
                      value={draftTask.priority}
                      onChange={(e) =>
                        setNewTaskDrafts((prev) => ({
                          ...prev,
                          [app.id]: {
                            ...draftTask,
                            priority: e.target.value as 'low' | 'medium' | 'high',
                          },
                        }))
                      }
                      aria-label="Task priority"
                      className="h-9 w-28 text-xs"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </Select>
                    <Input
                      type="date"
                      value={draftTask.dueDate}
                      onChange={(e) =>
                        setNewTaskDrafts((prev) => ({
                          ...prev,
                          [app.id]: { ...draftTask, dueDate: e.target.value },
                        }))
                      }
                      aria-label="Task due date"
                      className="h-9 w-36 text-xs"
                    />
                    <Button size="sm" variant="secondary" onClick={() => handleAddTask(app)}>
                      <Plus className="h-3.5 w-3.5" />
                      Add Task
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Application Dialog */}
      <Dialog
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Track Scholarship or Admission Application"
        description="Link a verified catalog record or create a custom entry for your personal tracker."
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleCreateApplication} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Link Verified Scholarship (optional)
              </label>
              <Select
                value={selectedScholarshipId}
                onChange={(e) => handleScholarshipSelect(e.target.value)}
              >
                <option value="">Custom / None</option>
                {scholarships
                  .filter((s) => !s.isArchived)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.countryCode})
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Link University (optional)
              </label>
              <Select
                value={selectedUniversityId}
                onChange={(e) => handleUniversitySelect(e.target.value)}
              >
                <option value="">Custom / None</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.countryCode})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Application Title *
            </label>
            <Input
              required
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g., PoliTO BSc Computer Engineering + EDISU Grant"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Institution / Provider *
              </label>
              <Input
                required
                value={universityName}
                onChange={(e) => setUniversityName(e.target.value)}
                placeholder="e.g., Politecnico di Torino"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Country</label>
              <Select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Initial Stage
              </label>
              <Select
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value as ApplicationStatus)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Deadline Date
              </label>
              <Input
                type="date"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Notes</label>
            <Textarea
              value={initialNotes}
              onChange={(e) => setInitialNotes(e.target.value)}
              placeholder="Document notarization notes, ISEE parificato steps, entrance exam dates..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add to Tracker</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteApplication(deleteTarget.id);
          pushToast({ title: 'Tracked application removed', variant: 'info' });
        }}
        title="Remove tracked application?"
        description={`Delete "${deleteTarget?.customTitle ?? ''}" and its personal checklist? Official portal submissions (if any) are unaffected.`}
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}
