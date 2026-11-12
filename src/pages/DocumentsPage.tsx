import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FolderCheck,
  Info,
  Plus,
  Trash2,
  UploadCloud,
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import { generateId } from '@/lib/utils';
import { dataService } from '@/services/dataService';
import type { DocumentStatus, StudentDocument } from '@/types/domain';

const CATEGORY_OPTIONS: Array<{ value: StudentDocument['category']; label: string }> = [
  { value: 'transcripts', label: 'Academic Transcripts' },
  { value: 'certificates', label: 'School Leaving Certificates' },
  { value: 'passport', label: 'Passport Copy' },
  { value: 'cv', label: 'CV / Resume' },
  { value: 'motivation_letter', label: 'Motivation Letter' },
  { value: 'sop', label: 'Statement of Purpose (SOP)' },
  { value: 'recommendations', label: 'Recommendation Letters' },
  { value: 'language_test', label: 'Language Test Reports' },
  { value: 'financial', label: 'Financial / Family Income Docs' },
  { value: 'portfolio', label: 'Portfolio / Coding Samples' },
  { value: 'other', label: 'Other Supporting Document' },
];

const DOC_STATUS_OPTIONS: Array<{
  value: DocumentStatus;
  label: string;
  variant: 'default' | 'warning' | 'secondary' | 'success';
}> = [
  { value: 'not_started', label: 'Not Started', variant: 'default' },
  { value: 'in_progress', label: 'In Progress', variant: 'warning' },
  { value: 'ready', label: 'Ready', variant: 'secondary' },
  { value: 'verified', label: 'Verified / Notarized', variant: 'success' },
];

export function DocumentsPage() {
  const { session } = useAuth();
  const { scholarships } = useCatalogData();
  const { userState, upsertDocument, deleteDocument } = useUserWorkspace();
  const { pushToast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | StudentDocument['category']>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DocumentStatus>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<StudentDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentDocument | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<StudentDocument['category']>('transcripts');
  const [status, setStatus] = useState<DocumentStatus>('in_progress');
  const [applicationId, setApplicationId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [attachmentMeta, setAttachmentMeta] = useState<{
    name: string;
    sizeBytes: number;
  } | null>(null);

  const documents = useMemo(() => userState?.documents ?? [], [userState?.documents]);
  const applications = useMemo(
    () => userState?.applications ?? [],
    [userState?.applications],
  );

  const filteredDocuments = useMemo(() => {
    return documents.filter((d) => {
      if (categoryFilter !== 'ALL' && d.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      return true;
    });
  }, [documents, categoryFilter, statusFilter]);

  const readinessStats = useMemo(() => {
    const total = documents.length;
    const readyCount = documents.filter(
      (d) => d.status === 'ready' || d.status === 'verified',
    ).length;
    const rate = total > 0 ? Math.round((readyCount / total) * 100) : 0;
    return { total, readyCount, rate };
  }, [documents]);

  // Missing documents analysis per tracked application
  const applicationDocumentGaps = useMemo(() => {
    return applications.map((app) => {
      const sch = scholarships.find((s) => s.id === app.scholarshipId);
      const requiredLabels = sch?.requiredDocuments ?? [
        'Official high school transcripts',
        'Valid passport',
        'English proficiency proof',
        'Motivation letter',
      ];

      const linkedReadyDocs = documents.filter(
        (d) =>
          (d.applicationId === null || d.applicationId === app.id) &&
          (d.status === 'ready' || d.status === 'verified'),
      );

      const appPendingDocs = documents.filter(
        (d) =>
          (d.applicationId === null || d.applicationId === app.id) &&
          (d.status === 'not_started' || d.status === 'in_progress'),
      );

      const missingHints = requiredLabels.filter((req) => {
        const words = req
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 4);
        return !linkedReadyDocs.some((doc) => {
          const docHay = `${doc.name} ${doc.category} ${doc.notes}`.toLowerCase();
          return words.some((w) => docHay.includes(w));
        });
      });

      return {
        app,
        requiredCount: requiredLabels.length,
        missingHints,
        pendingCount: appPendingDocs.length,
      };
    });
  }, [applications, scholarships, documents]);

  function openCreateModal() {
    setEditingDoc(null);
    setName('');
    setCategory('transcripts');
    setStatus('not_started');
    setApplicationId('');
    setNotes('');
    setAttachmentMeta(null);
    setModalOpen(true);
  }

  function openEditModal(doc: StudentDocument) {
    setEditingDoc(doc);
    setName(doc.name);
    setCategory(doc.category);
    setStatus(doc.status);
    setApplicationId(doc.applicationId ?? '');
    setNotes(doc.notes);
    setAttachmentMeta(
      doc.attachmentName
        ? { name: doc.attachmentName, sizeBytes: doc.attachmentSizeBytes ?? 0 }
        : null,
    );
    setModalOpen(true);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await dataService.uploadDocumentAttachment(session, file);
      setAttachmentMeta({ name: uploaded.path, sizeBytes: uploaded.sizeBytes });
      pushToast({ title: 'File uploaded to private storage', variant: 'success' });
    } catch (err) {
      pushToast({
        title: 'File attachment skipped',
        description: err instanceof Error ? err.message : 'Unable to upload file.',
        variant: 'warning',
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const payload: StudentDocument = {
      id: editingDoc?.id ?? generateId('doc'),
      applicationId: applicationId || null,
      name: name.trim(),
      category,
      status,
      notes: notes.trim(),
      attachmentName: attachmentMeta?.name,
      attachmentSizeBytes: attachmentMeta?.sizeBytes,
      updatedAt: new Date().toISOString(),
    };

    await upsertDocument(payload);
    pushToast({
      title: editingDoc ? 'Document updated' : 'Document added to checklist',
      variant: 'success',
    });
    setModalOpen(false);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title="Document Preparation"
        description="Track transcripts, passports, CVs, motivation letters, recommendations, and financial records."
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            Document Preparation Vault
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Track readiness across transcripts, passports, translations, language score reports, and
            financial need certificates.
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Add Document Item
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs text-text-muted">Tracked Documents</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{readinessStats.total}</p>
          <p className="mt-1 text-xs text-text-secondary">
            {readinessStats.readyCount} marked Ready or Verified
          </p>
        </Card>
        <Card className="md:col-span-2">
          <ProgressBar
            value={readinessStats.rate}
            label={`Overall Document Readiness (${readinessStats.readyCount}/${readinessStats.total})`}
          />
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-text-muted">
            <Info className="h-3.5 w-3.5 text-accent-secondary" />
            {session.mode === 'connected'
              ? 'Connected Mode: PDF, PNG, and JPEG attachments (up to 5 MB) upload to your private Supabase bucket.'
              : 'Demo Mode: Checklist statuses and notes persist locally; binary file uploads activate when Supabase is configured.'}
          </p>
        </Card>
      </div>

      {/* Missing Documents Per Application */}
      {applicationDocumentGaps.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold text-text-primary">
            Missing / Unconfirmed Documents by Application
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {applicationDocumentGaps.map(({ app, missingHints, pendingCount }) => (
              <Card key={app.id} className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{app.customTitle}</p>
                    <p className="text-xs text-text-secondary">{app.universityName}</p>
                  </div>
                  <Badge variant={missingHints.length === 0 && pendingCount === 0 ? 'success' : 'warning'}>
                    {missingHints.length === 0 && pendingCount === 0
                      ? 'Core Docs Ready'
                      : `${missingHints.length} Unmatched / ${pendingCount} Pending`}
                  </Badge>
                </div>

                {missingHints.length > 0 ? (
                  <ul className="space-y-1 text-xs text-text-secondary">
                    {missingHints.map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-warning" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-status-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    All listed requirements match ready or verified document items.
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as 'ALL' | StudentDocument['category'])
          }
          aria-label="Filter by document category"
          className="w-full sm:w-64"
        >
          <option value="ALL">All Categories ({documents.length})</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | DocumentStatus)}
          aria-label="Filter by document status"
          className="w-full sm:w-52"
        >
          <option value="ALL">All Statuses</option>
          {DOC_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Document Cards Grid */}
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDocuments.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3">
            <EmptyState
              icon={<FolderCheck className="h-6 w-6" />}
              title="No documents match these filters"
              description="Add transcripts, passport scans, CVs, motivation letters, or financial certificates to track your preparation."
              actionLabel="Add Document Item"
              onAction={openCreateModal}
            />
          </div>
        ) : (
          filteredDocuments.map((doc) => {
            const catLabel =
              CATEGORY_OPTIONS.find((c) => c.value === doc.category)?.label ?? doc.category;
            const statusMeta = DOC_STATUS_OPTIONS.find((s) => s.value === doc.status);
            const linkedApp = applications.find((a) => a.id === doc.applicationId);

            return (
              <Card key={doc.id} className="flex flex-col justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-accent-primary" />
                      <span className="text-xs font-medium text-text-muted">{catLabel}</span>
                    </div>
                    <Badge variant={statusMeta?.variant ?? 'default'}>
                      {statusMeta?.label ?? doc.status}
                    </Badge>
                  </div>

                  <h3 className="text-sm font-semibold text-text-primary">{doc.name}</h3>
                  <p className="text-xs text-text-secondary">
                    {linkedApp ? `Linked to: ${linkedApp.customTitle}` : 'General reusable dossier'}
                  </p>
                  {doc.notes && (
                    <p className="rounded-lg bg-bg-secondary p-2.5 text-xs text-text-secondary">
                      {doc.notes}
                    </p>
                  )}
                  {doc.attachmentName && (
                    <p className="truncate font-mono text-[11px] text-accent-secondary">
                      Attachment: {doc.attachmentName}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                  <Select
                    aria-label={`Change status of ${doc.name}`}
                    value={doc.status}
                    onChange={async (e) => {
                      await upsertDocument({
                        ...doc,
                        status: e.target.value as DocumentStatus,
                        updatedAt: new Date().toISOString(),
                      });
                      pushToast({ title: 'Document status updated', variant: 'success' });
                    }}
                    className="h-8 text-xs"
                  >
                    {DOC_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>

                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEditModal(doc)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${doc.name}`}
                      onClick={() => setDeleteTarget(doc)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-status-error" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Create / Edit Document Dialog */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDoc ? 'Edit Document Checklist Item' : 'Add Document Checklist Item'}
        description="Organize preparation notes, category, and optional verified file upload."
      >
        <form onSubmit={handleSaveDocument} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Document Name *
            </label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Grade 12 NEB Marksheet (Apostilled + English)"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Category</label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as StudentDocument['category'])}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Status</label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as DocumentStatus)}
              >
                {DOC_STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Associated Application
            </label>
            <Select
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
            >
              <option value="">General reusable dossier (all applications)</option>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.customTitle}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Preparation Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Translation requirements, notary details, Embassy legalization notes..."
            />
          </div>

          <div className="rounded-lg border border-dashed border-border-strong bg-bg-secondary/60 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
              <UploadCloud className="h-4 w-4 text-accent-primary" />
              <span>
                {uploading
                  ? 'Uploading...'
                  : 'Attach PDF/PNG/JPEG (max 5 MB, Connected Mode only)'}
              </span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="sr-only"
                disabled={uploading}
              />
            </label>
            {attachmentMeta && (
              <p className="mt-1.5 font-mono text-[11px] text-accent-secondary">
                Attached: {attachmentMeta.name} ({Math.round(attachmentMeta.sizeBytes / 1024)} KB)
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingDoc ? 'Save Changes' : 'Add Document'}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteDocument(deleteTarget.id);
          pushToast({ title: 'Document removed', variant: 'info' });
        }}
        title="Delete document checklist item?"
        description={`Remove "${deleteTarget?.name ?? ''}" from your preparation vault?`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
