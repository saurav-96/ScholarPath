import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { QualificationManager } from '@/components/common/QualificationManager';
import { Badge, Button, Card, Input, ProgressBar, Select } from '@/components/ui/Primitives';
import { useAuth } from '@/contexts/AuthContext';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import { DEFAULT_DEMO_PROFILE } from '@/data/demoDefaults';
import type { FundingPreference, StudentProfile } from '@/types/domain';

const SUBJECT_SUGGESTIONS = [
  'Computer Science',
  'Artificial Intelligence',
  'Software Engineering',
  'Data Science',
  'Information Engineering',
  'Mathematics',
  'Economics',
  'Electrical Engineering',
  'Business & Management',
  'Social Sciences',
];

const STEPS = [
  'Personal Profile',
  'Academic Result',
  'Language & Tests',
  'Destinations',
  'Degree & Subjects',
  'Funding Goal',
  'Target Intake',
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { session, continueAsDemo } = useAuth();
  const { countries } = useCatalogData();
  const { userState, saveProfile } = useUserWorkspace();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<StudentProfile>(
    userState?.profile ?? DEFAULT_DEMO_PROFILE,
  );
  const [customSubject, setCustomSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [gpaError, setGpaError] = useState<string | null>(null);

  useEffect(() => {
    if (userState?.profile) {
      setDraft(userState.profile);
    }
  }, [userState?.profile]);

  const toggleCountry = (code: string) => {
    setDraft((prev) => ({
      ...prev,
      preferredCountries: prev.preferredCountries.includes(code)
        ? prev.preferredCountries.filter((c) => c !== code)
        : [...prev.preferredCountries, code],
    }));
  };

  const toggleSubject = (sub: string) => {
    setDraft((prev) => ({
      ...prev,
      academicInterests: prev.academicInterests.includes(sub)
        ? prev.academicInterests.filter((s) => s !== sub)
        : [...prev.academicInterests, sub],
    }));
  };

  const handleNext = () => {
    if (step === 1 && draft.expectedGpa !== null) {
      if (draft.expectedGpa < 0 || draft.expectedGpa > 4.0) {
        setGpaError('Expected GPA must be between 0.0 and 4.0');
        return;
      }
    }
    setGpaError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (!session.authenticated && session.mode === 'demo') {
        continueAsDemo('student', draft.displayName);
      }
      await saveProfile({
        ...draft,
        onboardingCompleted: true,
      });
      navigate('/matcher');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageMeta
        title="Student Onboarding"
        description="Build your ScholarPath international student profile in 7 steps."
      />

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Badge variant="primary">Step {step + 1} of {STEPS.length}</Badge>
            <h1 className="mt-1 font-display text-2xl font-bold text-text-primary">
              Build Your Student Profile
            </h1>
          </div>
          <span className="text-xs text-text-secondary">{STEPS[step]}</span>
        </div>
        <ProgressBar value={Math.round(((step + 1) / STEPS.length) * 100)} />
      </div>

      <Card className="space-y-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Step 1: Personal Academic Profile
            </h2>
            <p className="text-sm text-text-secondary">
              We never ask for sensitive government IDs or passport numbers. All fields are editable later.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="onb-name" className="mb-1 block text-xs font-medium text-text-secondary">
                  Display Name
                </label>
                <Input
                  id="onb-name"
                  value={draft.displayName}
                  onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="onb-country" className="mb-1 block text-xs font-medium text-text-secondary">
                  Country of Origin (Citizenship)
                </label>
                <Input
                  id="onb-country"
                  value={draft.countryOfOrigin}
                  onChange={(e) => setDraft({ ...draft, countryOfOrigin: e.target.value })}
                  placeholder="e.g. Nepal"
                />
              </div>
            </div>
            <div>
              <label htmlFor="onb-edu" className="mb-1 block text-xs font-medium text-text-secondary">
                Current Education Status
              </label>
              <Input
                id="onb-edu"
                value={draft.educationStatus}
                onChange={(e) => setDraft({ ...draft, educationStatus: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Step 2: Educational Qualifications
            </h2>
            <p className="text-sm text-text-secondary">
              Enter your expected or final high-school GPA on a 0.0 to 4.0 scale (leave empty if pending).
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="onb-gpa" className="mb-1 block text-xs font-medium text-text-secondary">
                  Expected GPA (0.0 – 4.0)
                </label>
                <Input
                  id="onb-gpa"
                  type="number"
                  min={0}
                  max={4}
                  step="0.05"
                  value={draft.expectedGpa ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      expectedGpa: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
                {gpaError && <p className="mt-1 text-xs text-status-error">{gpaError}</p>}
              </div>
              <div>
                <label htmlFor="onb-gpascale" className="mb-1 block text-xs font-medium text-text-secondary">
                  Grading Scale Note
                </label>
                <Input
                  id="onb-gpascale"
                  value={draft.gpaScaleNote}
                  onChange={(e) => setDraft({ ...draft, gpaScaleNote: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Step 3: Language &amp; Standardized Tests
            </h2>
            <p className="text-sm text-text-secondary">
              Add IELTS, TOEFL, PTE, Duolingo, SAT, or other qualifications independently (obtained or planned).
            </p>
            <QualificationManager
              qualifications={draft.englishQualifications}
              onChange={(englishQualifications) => setDraft({ ...draft, englishQualifications })}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Step 4: Preferred Destination Countries
            </h2>
            <p className="text-sm text-text-secondary">
              Select the countries you want prioritized in recommendations and the matcher.
            </p>
            <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4">
              {countries.map((c) => {
                const active = draft.preferredCountries.includes(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleCountry(c.code)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                      active
                        ? 'border-accent-primary bg-accent-primary/15 text-accent-primary'
                        : 'border-border-subtle bg-bg-secondary text-text-secondary hover:border-border-strong'
                    }`}
                  >
                    {c.name} ({c.code})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Step 5: Intended Degree &amp; Subject Interests
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="onb-degree" className="mb-1 block text-xs font-medium text-text-secondary">
                  Intended Degree Level
                </label>
                <Select
                  id="onb-degree"
                  value={draft.intendedDegree}
                  onChange={(e) => setDraft({ ...draft, intendedDegree: e.target.value })}
                >
                  <option value="Bachelor's">Bachelor&apos;s</option>
                  <option value="Foundation / Pathway">Foundation / Pathway</option>
                  <option value="Master's">Master&apos;s</option>
                </Select>
              </div>
              <div>
                <label htmlFor="onb-lang" className="mb-1 block text-xs font-medium text-text-secondary">
                  Preferred Instruction Language
                </label>
                <Select
                  id="onb-lang"
                  value={draft.preferredLanguage}
                  onChange={(e) => setDraft({ ...draft, preferredLanguage: e.target.value })}
                >
                  <option value="English">English</option>
                  <option value="German">German</option>
                  <option value="Italian">Italian</option>
                  <option value="Dutch">Dutch</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Korean">Korean</option>
                </Select>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-text-secondary">Academic Interests</p>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_SUGGESTIONS.map((sub) => {
                  const selected = draft.academicInterests.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleSubject(sub)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        selected
                          ? 'border-accent-secondary bg-accent-secondary/15 text-accent-secondary'
                          : 'border-border-subtle bg-bg-secondary text-text-secondary hover:border-border-strong'
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Add custom subject (e.g. Cybersecurity)"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (customSubject.trim()) {
                      toggleSubject(customSubject.trim());
                      setCustomSubject('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Step 6: Financial Requirements
            </h2>
            <div>
              <label htmlFor="onb-funding" className="mb-1 block text-xs font-medium text-text-secondary">
                Funding Preference
              </label>
              <Select
                id="onb-funding"
                value={draft.fundingPreference}
                onChange={(e) =>
                  setDraft({ ...draft, fundingPreference: e.target.value as FundingPreference })
                }
              >
                <option value="full_tuition_and_living">
                  Full scholarships covering tuition and living expenses
                </option>
                <option value="full_tuition_only">Full tuition coverage (self-fund living)</option>
                <option value="partial_or_affordable">Partial scholarships or low public tuition</option>
                <option value="any">Any verified funding option</option>
              </Select>
            </div>
            <div>
              <label htmlFor="onb-budget" className="mb-1 block text-xs font-medium text-text-secondary">
                Maximum Personal Annual Budget (USD)
              </label>
              <Input
                id="onb-budget"
                type="number"
                min={0}
                value={draft.maxAnnualBudgetUsd ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    maxAnnualBudgetUsd: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Step 7: Expected Intake &amp; Confirmation
            </h2>
            <div>
              <label htmlFor="onb-intake" className="mb-1 block text-xs font-medium text-text-secondary">
                Target Academic Intake
              </label>
              <Select
                id="onb-intake"
                value={draft.targetIntake}
                onChange={(e) => setDraft({ ...draft, targetIntake: e.target.value })}
              >
                <option value="2027">2027 (Fall / Autumn / Spring)</option>
                <option value="2028">2028</option>
                <option value="2026">2026 (Late / Rolling)</option>
              </Select>
            </div>

            <div className="rounded-lg border border-border-subtle bg-bg-secondary p-4 text-xs text-text-secondary">
              <p className="font-semibold text-text-primary">Profile Summary</p>
              <p className="mt-1">
                {draft.countryOfOrigin} • {draft.intendedDegree} • {draft.academicInterests.join(', ')} •{' '}
                GPA {draft.expectedGpa ?? 'Not entered'} • {draft.preferredCountries.join(', ')}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border-subtle pt-4">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext}>
              Next Step
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving}>
              <CheckCircle2 className="h-4 w-4" />
              {saving ? 'Saving Profile...' : 'Save & View Matched Scholarships'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
