import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Input, Select } from '@/components/ui/Primitives';
import { generateId } from '@/lib/utils';
import type { LanguageQualification, QualificationType } from '@/types/domain';

const TEST_TYPES: { value: QualificationType; label: string; hint: string }[] = [
  { value: 'IELTS', label: 'IELTS Academic', hint: 'e.g. 7.0' },
  { value: 'TOEFL_IBT', label: 'TOEFL iBT', hint: 'e.g. 95' },
  { value: 'PTE', label: 'PTE Academic', hint: 'e.g. 65' },
  { value: 'DUOLINGO', label: 'Duolingo English Test', hint: 'e.g. 120' },
  { value: 'SAT', label: 'SAT', hint: 'e.g. 1420' },
  { value: 'OTHER', label: 'Other Qualification', hint: 'e.g. Medium of Instruction / IB English' },
];

export function QualificationManager({
  qualifications,
  onChange,
}: {
  qualifications: LanguageQualification[];
  onChange: (next: LanguageQualification[]) => void;
}) {
  const [type, setType] = useState<QualificationType>('IELTS');
  const [customLabel, setCustomLabel] = useState('');
  const [score, setScore] = useState('');
  const [status, setStatus] = useState<'obtained' | 'planned'>('obtained');
  const [testDate, setTestDate] = useState('');

  const handleAdd = () => {
    if (!score.trim()) return;
    const numeric = Number(score.replace(/[^0-9.]/g, ''));
    const nextItem: LanguageQualification = {
      id: generateId('qual'),
      type,
      label: type === 'OTHER' ? customLabel.trim() || 'Other Test' : undefined,
      score: score.trim(),
      numericValue: Number.isFinite(numeric) && numeric > 0 ? numeric : undefined,
      status,
      testDate: testDate || undefined,
    };
    onChange([...qualifications, nextItem]);
    setScore('');
    setCustomLabel('');
    setTestDate('');
  };

  const selectedHint = TEST_TYPES.find((t) => t.value === type)?.hint ?? 'Score';

  return (
    <div className="space-y-3">
      {qualifications.length > 0 && (
        <div className="space-y-2">
          {qualifications.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-bg-secondary px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary">
                  {item.type === 'OTHER' ? item.label || 'Other' : item.type.replace('_', ' ')}
                </Badge>
                <span className="font-mono font-medium text-text-primary">{item.score}</span>
                <Badge variant={item.status === 'obtained' ? 'success' : 'warning'}>
                  {item.status === 'obtained' ? 'Obtained' : 'Planned'}
                </Badge>
                {item.testDate && (
                  <span className="text-xs text-text-muted">({item.testDate})</span>
                )}
              </div>
              <button
                type="button"
                aria-label={`Remove ${item.type} entry`}
                onClick={() => onChange(qualifications.filter((q) => q.id !== item.id))}
                className="rounded p-1 text-text-muted hover:bg-bg-surface hover:text-status-error"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-2 rounded-lg border border-border-subtle bg-bg-secondary p-3 sm:grid-cols-12">
        <div className="sm:col-span-3">
          <label htmlFor="qual-type" className="mb-1 block text-xs text-text-secondary">
            Qualification
          </label>
          <Select
            id="qual-type"
            value={type}
            onChange={(e) => setType(e.target.value as QualificationType)}
          >
            {TEST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>

        {type === 'OTHER' && (
          <div className="sm:col-span-3">
            <label htmlFor="qual-custom" className="mb-1 block text-xs text-text-secondary">
              Test Name
            </label>
            <Input
              id="qual-custom"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. Goethe B2 / MOI"
            />
          </div>
        )}

        <div className={type === 'OTHER' ? 'sm:col-span-2' : 'sm:col-span-3'}>
          <label htmlFor="qual-score" className="mb-1 block text-xs text-text-secondary">
            Score
          </label>
          <Input
            id="qual-score"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder={selectedHint}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="qual-status" className="mb-1 block text-xs text-text-secondary">
            Status
          </label>
          <Select
            id="qual-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'obtained' | 'planned')}
          >
            <option value="obtained">Obtained</option>
            <option value="planned">Planned</option>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="qual-date" className="mb-1 block text-xs text-text-secondary">
            Date
          </label>
          <Input
            id="qual-date"
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
          />
        </div>

        <div className="flex items-end sm:col-span-2">
          <Button type="button" variant="secondary" className="w-full" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
