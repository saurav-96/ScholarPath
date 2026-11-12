import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, FolderPlus, GitCompare, Trash2 } from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { FundingTierBadge } from '@/components/common/FundingTierBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge, Button, Card, Input, Select, Textarea } from '@/components/ui/Primitives';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import { formatDeadlineDisplay } from '@/lib/dates';

export function SavedPage() {
  const navigate = useNavigate();
  const { scholarships, universities } = useCatalogData();
  const {
    userState,
    toggleSavedScholarship,
    updateSavedMeta,
    toggleSavedUniversity,
    createCollection,
  } = useUserWorkspace();

  const [newColName, setNewColName] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('ALL');
  const [compareSchIds, setCompareSchIds] = useState<string[]>([]);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  const savedScholarshipsDetailed = useMemo(() => {
    return (userState?.savedScholarships ?? [])
      .map((saved) => ({
        saved,
        scholarship: scholarships.find((s) => s.id === saved.scholarshipId),
      }))
      .filter((x): x is { saved: typeof x.saved; scholarship: NonNullable<typeof x.scholarship> } =>
        Boolean(x.scholarship),
      )
      .filter(
        ({ saved }) =>
          selectedCollection === 'ALL' || saved.collectionId === selectedCollection,
      );
  }, [userState?.savedScholarships, scholarships, selectedCollection]);

  const savedUniversitiesDetailed = useMemo(() => {
    return (userState?.savedUniversities ?? [])
      .map((saved) => ({
        saved,
        university: universities.find((u) => u.id === saved.universityId),
      }))
      .filter((x): x is { saved: typeof x.saved; university: NonNullable<typeof x.university> } =>
        Boolean(x.university),
      );
  }, [userState?.savedUniversities, universities]);

  const comparedScholarships = useMemo(
    () =>
      compareSchIds
        .map((id) => scholarships.find((s) => s.id === id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    [compareSchIds, scholarships],
  );

  const toggleCompareSch = (id: string) => {
    setCompareSchIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev,
    );
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    await createCollection({
      name: newColName.trim(),
      description: 'Personal opportunity collection',
      color: '#8B7CFF',
    });
    setNewColName('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title="Saved Opportunities & Collections"
        description="Organize bookmarked scholarships and universities into custom collections with private notes."
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary">Module H • Saved Workspace</Badge>
          <h1 className="mt-2 font-display text-3xl font-bold text-text-primary">
            Saved Opportunities &amp; Collections
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Bookmark opportunities, organize collections, add private notes, and compare saved awards.
          </p>
        </div>
      </div>

      {/* Collections Manager */}
      <Card className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={selectedCollection === 'ALL' ? 'primary' : 'outline'}
              onClick={() => setSelectedCollection('ALL')}
            >
              All Saved ({userState?.savedScholarships.length ?? 0})
            </Button>
            {(userState?.collections ?? []).map((col) => (
              <Button
                key={col.id}
                size="sm"
                variant={selectedCollection === col.id ? 'primary' : 'outline'}
                onClick={() => setSelectedCollection(col.id)}
              >
                {col.name}
              </Button>
            ))}
          </div>

          <form onSubmit={handleCreateCollection} className="flex items-center gap-2">
            <Input
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="New collection name..."
              aria-label="New collection name"
              className="h-8 w-48 text-xs"
            />
            <Button type="submit" size="sm" variant="secondary">
              <FolderPlus className="h-3.5 w-3.5" />
              Create
            </Button>
          </form>
        </div>
      </Card>

      {/* Saved Scholarships */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-text-primary">
          Saved Scholarships ({savedScholarshipsDetailed.length})
        </h2>

        {savedScholarshipsDetailed.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="h-6 w-6" />}
            title="No saved scholarships in this collection"
            description="Explore verified bachelor scholarships and click Bookmark to save them here."
            actionLabel="Explore Scholarships"
            onAction={() => navigate('/scholarships')}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {savedScholarshipsDetailed.map(({ saved, scholarship }) => {
              const currentNote = editingNotes[saved.id] ?? saved.notes;
              const isCompared = compareSchIds.includes(scholarship.id);

              return (
                <Card key={saved.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        to={`/scholarships/${scholarship.slug}`}
                        className="text-base font-semibold text-text-primary hover:text-accent-primary"
                      >
                        {scholarship.name}
                      </Link>
                      <p className="text-xs text-text-secondary">
                        {scholarship.countryName} • {scholarship.institutionDisplay}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={isCompared ? 'secondary' : 'outline'}
                        onClick={() => toggleCompareSch(scholarship.id)}
                      >
                        <GitCompare className="h-3.5 w-3.5" />
                        {isCompared ? 'Comparing' : 'Compare'}
                      </Button>
                      <button
                        type="button"
                        aria-label={`Remove ${scholarship.name}`}
                        onClick={() => toggleSavedScholarship({ scholarshipId: scholarship.id })}
                        className="rounded-lg border border-border-subtle p-1.5 text-text-muted hover:text-status-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <FundingTierBadge tier={scholarship.fundingTier} />
                    <Badge variant="outline">
                      Deadline:{' '}
                      {formatDeadlineDisplay(
                        scholarship.applicationDeadline,
                        scholarship.deadlineTimezone,
                      )}
                    </Badge>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] text-text-muted">Collection</label>
                      <Select
                        value={saved.collectionId ?? ''}
                        onChange={(e) =>
                          updateSavedMeta({
                            savedId: saved.id,
                            collectionId: e.target.value || null,
                            notes: currentNote,
                          })
                        }
                        className="h-8 text-xs"
                      >
                        <option value="">Unassigned</option>
                        {(userState?.collections ?? []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateSavedMeta({
                            savedId: saved.id,
                            collectionId: saved.collectionId,
                            notes: currentNote,
                          })
                        }
                      >
                        Save Note
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    value={currentNote}
                    onChange={(e) =>
                      setEditingNotes((prev) => ({ ...prev, [saved.id]: e.target.value }))
                    }
                    placeholder="Add private notes about eligibility, documents, or deadlines..."
                    className="min-h-[64px] text-xs"
                  />
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Side-by-Side Saved Scholarship Comparison */}
      {comparedScholarships.length >= 2 && (
        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl font-bold text-text-primary">
            Saved Scholarship Comparison
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-surface">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-secondary">
                  <th className="p-3 text-text-muted">Dimension</th>
                  {comparedScholarships.map((s) => (
                    <th key={s.id} className="p-3 font-semibold text-text-primary">
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                <tr>
                  <td className="p-3 font-medium text-text-secondary">Country</td>
                  {comparedScholarships.map((s) => (
                    <td key={s.id} className="p-3">{s.countryName}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-medium text-text-secondary">Tuition Coverage</td>
                  {comparedScholarships.map((s) => (
                    <td key={s.id} className="p-3">{s.tuitionCoverage.note}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-medium text-text-secondary">Living Coverage</td>
                  {comparedScholarships.map((s) => (
                    <td key={s.id} className="p-3">{s.livingCoverage.note}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-medium text-text-secondary">Application Fee</td>
                  {comparedScholarships.map((s) => (
                    <td key={s.id} className="p-3 font-mono">
                      {s.applicationFeeAmount === 0
                        ? '0 (Free)'
                        : `${s.applicationFeeAmount ?? '?'} ${s.applicationFeeCurrency}`}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-medium text-text-secondary">Deadline</td>
                  {comparedScholarships.map((s) => (
                    <td key={s.id} className="p-3">
                      {formatDeadlineDisplay(s.applicationDeadline, s.deadlineTimezone)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Saved Universities */}
      <section className="mt-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-text-primary">
            Saved Universities ({savedUniversitiesDetailed.length})
          </h2>
          {savedUniversitiesDetailed.length >= 2 && (
            <Link
              to={`/compare/universities?ids=${savedUniversitiesDetailed
                .slice(0, 4)
                .map((x) => x.university.id)
                .join(',')}`}
            >
              <Button size="sm" variant="outline">
                <GitCompare className="h-3.5 w-3.5" />
                Compare Saved Universities
              </Button>
            </Link>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {savedUniversitiesDetailed.map(({ saved, university }) => (
            <Card key={saved.id} className="flex items-start justify-between gap-2">
              <div>
                <Link
                  to={`/universities/${university.slug}`}
                  className="text-sm font-semibold text-text-primary hover:text-accent-primary"
                >
                  {university.name}
                </Link>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {university.city}, {university.countryName}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${university.name}`}
                onClick={() => toggleSavedUniversity({ universityId: university.id })}
                className="rounded p-1 text-text-muted hover:text-status-error"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
