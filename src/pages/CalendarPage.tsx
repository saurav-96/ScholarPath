import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Globe, Plus, Trash2 } from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { Badge, Button, Card, Input, Select, Textarea } from '@/components/ui/Primitives';
import { useToast } from '@/contexts/ToastContext';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import { formatEventInTimezone, getUserTimezone } from '@/lib/dates';
import { generateId } from '@/lib/utils';
import type { CalendarEvent } from '@/types/domain';

interface CombinedCalendarItem {
  id: string;
  title: string;
  dateStr: string;
  category: CalendarEvent['category'];
  timezone: string;
  countryCode?: string;
  scholarshipSlug?: string;
  notes: string;
  isUserCreated: boolean;
  rawUserEvent?: CalendarEvent;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function CalendarPage() {
  const { scholarships, countries } = useCatalogData();
  const { userState, upsertCalendarEvent, deleteCalendarEvent } = useUserWorkspace();
  const { pushToast } = useToast();

  const userTimezone = useMemo(() => getUserTimezone(), []);

  // Default calendar view to November 2026 (where multiple 2027 intake scholarships open/close)
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(10); // 0-indexed: 10 = Nov
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | CalendarEvent['category']>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);

  const [titleInput, setTitleInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<CalendarEvent['category']>('personal_reminder');
  const [dateInput, setDateInput] = useState('2026-11-15');
  const [timezoneInput, setTimezoneInput] = useState(userTimezone);
  const [notesInput, setNotesInput] = useState('');

  const allItems = useMemo<CombinedCalendarItem[]>(() => {
    const items: CombinedCalendarItem[] = [];

    for (const sch of scholarships) {
      if (sch.isArchived) continue;
      if (sch.applicationOpenDate) {
        items.push({
          id: `open-${sch.id}`,
          title: `Opens: ${sch.name}`,
          dateStr: sch.applicationOpenDate,
          category: 'opening',
          timezone: sch.deadlineTimezone || 'UTC',
          countryCode: sch.countryCode,
          scholarshipSlug: sch.slug,
          notes: sch.deadlineNote || sch.summary,
          isUserCreated: false,
        });
      }
      if (sch.applicationDeadline) {
        items.push({
          id: `due-${sch.id}`,
          title: `Deadline: ${sch.name}`,
          dateStr: sch.applicationDeadline,
          category: 'deadline',
          timezone: sch.deadlineTimezone || 'UTC',
          countryCode: sch.countryCode,
          scholarshipSlug: sch.slug,
          notes: sch.deadlineNote || sch.summary,
          isUserCreated: false,
        });
      }
    }

    for (const app of userState?.applications ?? []) {
      if (app.deadline) {
        items.push({
          id: `app-${app.id}`,
          title: `Tracked Target: ${app.customTitle}`,
          dateStr: app.deadline,
          category: 'deadline',
          timezone: userTimezone,
          countryCode: app.countryCode,
          notes: app.personalNotes || `Tracked status: ${app.status}`,
          isUserCreated: false,
        });
      }
    }

    for (const evt of userState?.calendarEvents ?? []) {
      items.push({
        id: evt.id,
        title: evt.title,
        dateStr: evt.eventDate,
        category: evt.category,
        timezone: evt.timezone || userTimezone,
        notes: evt.notes,
        isUserCreated: true,
        rawUserEvent: evt,
      });
    }

    return items
      .filter((item) => {
        if (countryFilter !== 'ALL' && item.countryCode && item.countryCode !== countryFilter) {
          return false;
        }
        if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [scholarships, userState?.applications, userState?.calendarEvents, userTimezone, countryFilter, categoryFilter]);

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthItems = useMemo(
    () => allItems.filter((item) => item.dateStr.startsWith(monthPrefix)),
    [allItems, monthPrefix],
  );

  // Calendar day grid cells
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ day: number | null; isoDate?: string }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null });
    }
    for (let day = 1; day <= totalDays; day++) {
      cells.push({
        day,
        isoDate: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      });
    }
    return cells;
  }, [viewYear, viewMonth]);

  function changeMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function openAddModal(presetDate?: string) {
    setEditingEvent(null);
    setTitleInput('');
    setCategoryInput('personal_reminder');
    setDateInput(presetDate || `${monthPrefix}-15`);
    setTimezoneInput(userTimezone);
    setNotesInput('');
    setModalOpen(true);
  }

  function openEditModal(evt: CalendarEvent) {
    setEditingEvent(evt);
    setTitleInput(evt.title);
    setCategoryInput(evt.category);
    setDateInput(evt.eventDate);
    setTimezoneInput(evt.timezone || userTimezone);
    setNotesInput(evt.notes);
    setModalOpen(true);
  }

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!titleInput.trim() || !dateInput) return;

    const payload: CalendarEvent = {
      id: editingEvent?.id ?? generateId('evt'),
      scholarshipId: editingEvent?.scholarshipId ?? null,
      applicationId: editingEvent?.applicationId ?? null,
      title: titleInput.trim(),
      category: categoryInput,
      eventDate: dateInput,
      timezone: timezoneInput || userTimezone,
      notes: notesInput.trim(),
      isUserCreated: true,
    };
    await upsertCalendarEvent(payload);
    pushToast({
      title: editingEvent ? 'Calendar event updated' : 'Reminder added to calendar',
      variant: 'success',
    });
    setModalOpen(false);
  }

  const categoryVariant = (cat: CalendarEvent['category']) => {
    switch (cat) {
      case 'deadline':
        return 'error' as const;
      case 'opening':
        return 'secondary' as const;
      case 'test_date':
        return 'warning' as const;
      default:
        return 'primary' as const;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title="Deadline & Milestone Calendar"
        description="View international scholarship openings, deadlines, and personal exam or visa reminders with dual timezone display."
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            Scholarship & Application Calendar
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
            <Globe className="h-4 w-4 text-accent-secondary" />
            Displaying local dates in your detected timezone:{' '}
            <span className="font-mono font-medium text-text-primary">{userTimezone}</span>
          </p>
        </div>
        <Button onClick={() => openAddModal()}>
          <Plus className="h-4 w-4" />
          Add Personal Reminder
        </Button>
      </div>

      {/* Controls */}
      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[160px] text-center font-display text-base font-bold text-text-primary">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const now = new Date();
              setViewYear(now.getFullYear());
              setViewMonth(now.getMonth());
            }}
          >
            Today
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Filter by country"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="h-9 w-44 text-xs"
          >
            <option value="ALL">All Countries</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by event category"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as 'ALL' | CalendarEvent['category'])
            }
            className="h-9 w-44 text-xs"
          >
            <option value="ALL">All Event Types</option>
            <option value="deadline">Deadlines</option>
            <option value="opening">Application Openings</option>
            <option value="test_date">Test Dates (IELTS/SAT)</option>
            <option value="personal_reminder">Personal Reminders</option>
          </Select>
        </div>
      </Card>

      {/* Monthly Grid */}
      <Card className="mt-6 overflow-x-auto p-3 sm:p-5">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 gap-2 border-b border-border-subtle pb-2 text-center text-xs font-semibold text-text-muted">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell.day || !cell.isoDate) {
                return <div key={`empty-${idx}`} className="min-h-[92px] rounded-lg bg-bg-secondary/30" />;
              }
              const dayEvents = allItems.filter((item) => item.dateStr === cell.isoDate);
              return (
                <div
                  key={cell.isoDate}
                  className="flex min-h-[92px] flex-col justify-between rounded-lg border border-border-subtle bg-bg-secondary/60 p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-text-primary">
                      {cell.day}
                    </span>
                    <button
                      type="button"
                      onClick={() => openAddModal(cell.isoDate)}
                      aria-label={`Add event on ${cell.isoDate}`}
                      className="rounded p-0.5 text-text-muted hover:bg-bg-elevated hover:text-accent-primary"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 2).map((evt) => (
                      <div
                        key={evt.id}
                        className="truncate rounded bg-accent-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-text-primary"
                        title={evt.title}
                      >
                        {evt.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[10px] text-accent-secondary">
                        +{dayEvents.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Month Agenda & Timezone Details */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-text-primary">
            <CalendarDays className="h-5 w-5 text-accent-primary" />
            {MONTH_NAMES[viewMonth]} {viewYear} Events ({monthItems.length})
          </h2>
          {monthItems.length === 0 ? (
            <Card className="text-sm text-text-secondary">
              No scheduled scholarship openings, deadlines, or reminders in {MONTH_NAMES[viewMonth]}{' '}
              {viewYear}. Browse upcoming timeline milestones on the right or add a custom
              reminder.
            </Card>
          ) : (
            monthItems.map((evt) => (
              <Card key={evt.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={categoryVariant(evt.category)}>
                        {evt.category.replace('_', ' ')}
                      </Badge>
                      {evt.countryCode && <Badge variant="outline">{evt.countryCode}</Badge>}
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary">
                      {evt.scholarshipSlug ? (
                        <Link
                          to={`/scholarships/${evt.scholarshipSlug}`}
                          className="hover:text-accent-primary"
                        >
                          {evt.title}
                        </Link>
                      ) : (
                        evt.title
                      )}
                    </h3>
                  </div>

                  {evt.isUserCreated && evt.rawUserEvent && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(evt.rawUserEvent!)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${evt.title}`}
                        onClick={() => setDeleteTarget(evt.rawUserEvent!)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-status-error" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-bg-secondary p-2.5 text-xs text-text-secondary">
                  <p>
                    <span className="text-text-muted">Official / Source Timezone ({evt.timezone}):</span>{' '}
                    <span className="font-mono text-text-primary">
                      {formatEventInTimezone(evt.dateStr, evt.timezone)}
                    </span>
                  </p>
                  <p className="mt-0.5">
                    <span className="text-text-muted">Your Local Time ({userTimezone}):</span>{' '}
                    <span className="font-mono text-accent-secondary">
                      {formatEventInTimezone(evt.dateStr, userTimezone)}
                    </span>
                  </p>
                </div>

                {evt.notes && <p className="text-xs text-text-secondary">{evt.notes}</p>}
              </Card>
            ))
          )}
        </div>

        {/* Chronological Upcoming All-Events Feed */}
        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold text-text-primary">
            All Scheduled Timeline Milestones ({allItems.length})
          </h2>
          <div className="max-h-[540px] space-y-2.5 overflow-y-auto pr-1">
            {allItems.map((evt) => (
              <Card key={`list-${evt.id}`} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-accent-primary">
                      {evt.dateStr}
                    </span>
                    <Badge variant={categoryVariant(evt.category)}>
                      {evt.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-text-primary">
                    {evt.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const [y, m] = evt.dateStr.split('-').map(Number);
                    if (y && m) {
                      setViewYear(y);
                      setViewMonth(m - 1);
                    }
                  }}
                  className="shrink-0 rounded-lg border border-border-subtle px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                >
                  Jump to Month
                </button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Add / Edit Event Dialog */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEvent ? 'Edit Calendar Event' : 'Add Personal Deadline or Exam Reminder'}
        description="Track IELTS/SAT sittings, document apostille appointments, or embassy deadlines."
      >
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Event Title *
            </label>
            <Input
              required
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="e.g., IELTS Academic Sitting or SAT Registration Deadline"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Category</label>
              <Select
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value as CalendarEvent['category'])}
              >
                <option value="personal_reminder">Personal Reminder</option>
                <option value="test_date">Language / Standardized Test</option>
                <option value="deadline">Application Deadline</option>
                <option value="opening">Application Opening</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Date *
              </label>
              <Input
                type="date"
                required
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Reference Timezone
            </label>
            <Input
              value={timezoneInput}
              onChange={(e) => setTimezoneInput(e.target.value)}
              placeholder="e.g., Europe/Rome or Asia/Kathmandu"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Notes</label>
            <Textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Test center address, portal links, checklist reminder..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingEvent ? 'Save Event' : 'Add Event'}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteCalendarEvent(deleteTarget.id);
          pushToast({ title: 'Calendar event deleted', variant: 'info' });
        }}
        title="Delete calendar reminder?"
        description={`Remove "${deleteTarget?.title ?? ''}" from your personal calendar?`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
