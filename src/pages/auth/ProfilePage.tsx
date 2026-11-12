import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Save, Sparkles } from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { QualificationManager } from '@/components/common/QualificationManager';
import { Badge, Button, Card, Input, Select } from '@/components/ui/Primitives';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import { studentProfileSchema } from '@/schemas/validation';
import type { FundingPreference, StudentProfile } from '@/types/domain';

export function ProfilePage() {
  const { session, resetDemo } = useAuth();
  const { pushToast } = useToast();
  const { countries } = useCatalogData();
  const { userState, saveProfile } = useUserWorkspace();
  const [form, setForm] = useState<StudentProfile | null>(null);
  const [interestsInput, setInterestsInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userState?.profile) {
      setForm(userState.profile);
      setInterestsInput(userState.profile.academicInterests.join(', '));
    }
  }, [userState?.profile]);

  if (!form) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-text-secondary">
        Loading student profile...
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const parsedInterests = interestsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const candidate: StudentProfile = {
      ...form,
      academicInterests: parsedInterests,
    };

    const result = studentProfileSchema.safeParse(candidate);
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Please check profile inputs.');
      return;
    }

    setSaving(true);
    try {
      await saveProfile(candidate);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title="Student Profile"
        description="Edit your citizenship, GPA, test scores, preferred destinations, and funding preferences."
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant={session.mode === 'connected' ? 'success' : 'secondary'}>
            {session.mode === 'connected' ? 'Connected Account' : 'Configurable Demo Persona'}
          </Badge>
          <h1 className="mt-2 font-display text-2xl font-bold text-text-primary">
            Student Academic &amp; Funding Profile
          </h1>
          <p className="text-sm text-text-secondary">
            Every scholarship match score updates immediately when you change these settings.
          </p>
        </div>

        <div className="flex gap-2">
          <Link to="/matcher">
            <Button variant="secondary" size="sm">
              <Sparkles className="h-4 w-4" />
              Open AI Matcher
            </Button>
          </Link>
          {session.mode === 'demo' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetDemo();
                pushToast({ title: 'Demo profile reset to initial Nepal defaults', variant: 'info' });
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset Demo Defaults
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {validationError && (
          <div className="rounded-lg border border-status-error/40 bg-status-error/10 p-3 text-sm text-status-error">
            {validationError}
          </div>
        )}

        <Card className="space-y-4">
          <h2 className="text-base font-semibold text-text-primary">Personal &amp; Academic</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prof-name" className="mb-1 block text-xs font-medium text-text-secondary">
                Display Name
              </label>
              <Input
                id="prof-name"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="prof-origin" className="mb-1 block text-xs font-medium text-text-secondary">
                Country of Origin
              </label>
              <Input
                id="prof-origin"
                value={form.countryOfOrigin}
                onChange={(e) => setForm({ ...form, countryOfOrigin: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="prof-degree" className="mb-1 block text-xs font-medium text-text-secondary">
                Intended Degree
              </label>
              <Select
                id="prof-degree"
                value={form.intendedDegree}
                onChange={(e) => setForm({ ...form, intendedDegree: e.target.value })}
              >
                <option value="Bachelor's">Bachelor&apos;s</option>
                <option value="Foundation / Pathway">Foundation / Pathway</option>
                <option value="Master's">Master&apos;s</option>
              </Select>
            </div>
            <div>
              <label htmlFor="prof-gpa" className="mb-1 block text-xs font-medium text-text-secondary">
                Expected GPA (0.0 – 4.0)
              </label>
              <Input
                id="prof-gpa"
                type="number"
                min={0}
                max={4}
                step="0.01"
                value={form.expectedGpa ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    expectedGpa: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="prof-interests" className="mb-1 block text-xs font-medium text-text-secondary">
                Academic Interests (comma-separated)
              </label>
              <Input
                id="prof-interests"
                value={interestsInput}
                onChange={(e) => setInterestsInput(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-base font-semibold text-text-primary">
            English Proficiency &amp; Standardized Tests
          </h2>
          <QualificationManager
            qualifications={form.englishQualifications}
            onChange={(englishQualifications) => setForm({ ...form, englishQualifications })}
          />
        </Card>

        <Card className="space-y-4">
          <h2 className="text-base font-semibold text-text-primary">
            Destinations, Intake &amp; Funding Preference
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="prof-lang" className="mb-1 block text-xs font-medium text-text-secondary">
                Preferred Instruction Language
              </label>
              <Select
                id="prof-lang"
                value={form.preferredLanguage}
                onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
              >
                <option value="English">English</option>
                <option value="German">German</option>
                <option value="Italian">Italian</option>
                <option value="Dutch">Dutch</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
              </Select>
            </div>
            <div>
              <label htmlFor="prof-intake" className="mb-1 block text-xs font-medium text-text-secondary">
                Target Intake
              </label>
              <Input
                id="prof-intake"
                value={form.targetIntake}
                onChange={(e) => setForm({ ...form, targetIntake: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="prof-budget" className="mb-1 block text-xs font-medium text-text-secondary">
                Max Annual Budget (USD)
              </label>
              <Input
                id="prof-budget"
                type="number"
                min={0}
                value={form.maxAnnualBudgetUsd ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxAnnualBudgetUsd: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div>
            <label htmlFor="prof-funding" className="mb-1 block text-xs font-medium text-text-secondary">
              Funding Preference
            </label>
            <Select
              id="prof-funding"
              value={form.fundingPreference}
              onChange={(e) =>
                setForm({ ...form, fundingPreference: e.target.value as FundingPreference })
              }
            >
              <option value="full_tuition_and_living">
                Full scholarships covering tuition and living expenses
              </option>
              <option value="full_tuition_only">Full tuition only</option>
              <option value="partial_or_affordable">Partial tuition / affordable public universities</option>
              <option value="any">Any funding option</option>
            </Select>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-text-secondary">Preferred Countries</p>
            <div className="flex flex-wrap gap-2">
              {countries.map((c) => {
                const active = form.preferredCountries.includes(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setForm({
                        ...form,
                        preferredCountries: active
                          ? form.preferredCountries.filter((code) => code !== c.code)
                          : [...form.preferredCountries, c.code],
                      })
                    }
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                      active
                        ? 'border-accent-primary bg-accent-primary/15 text-accent-primary'
                        : 'border-border-subtle bg-bg-secondary text-text-secondary'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Student Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
