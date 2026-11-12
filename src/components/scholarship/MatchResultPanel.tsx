import { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Sparkles,
  ThumbsUp,
} from 'lucide-react';
import { Badge, Button, Card, Input, ProgressBar } from '@/components/ui/Primitives';
import { generateScholarshipGuidance, type AiGuidanceResponse } from '@/services/aiAdapter';
import type { Scholarship, ScholarshipMatchResult, StudentProfile } from '@/types/domain';

export function MatchResultPanel({
  scholarship,
  profile,
  match,
}: {
  scholarship: Scholarship;
  profile: StudentProfile;
  match: ScholarshipMatchResult;
}) {
  const [question, setQuestion] = useState('');
  const [guidance, setGuidance] = useState<AiGuidanceResponse | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  const handleAnalyze = async () => {
    setLoadingAdvice(true);
    try {
      const res = await generateScholarshipGuidance(
        scholarship,
        profile,
        match,
        question.trim() || undefined,
      );
      setGuidance(res);
    } finally {
      setLoadingAdvice(false);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            Transparent Eligibility &amp; Match Evaluation
          </h3>
          <p className="text-xs text-text-secondary">
            Hard eligibility checks are separated from preference weights and never masked.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              match.confidence === 'high'
                ? 'success'
                : match.confidence === 'medium'
                ? 'warning'
                : 'default'
            }
          >
            Confidence: {match.confidence.toUpperCase()}
          </Badge>
          <Badge
            variant={
              match.eligibilityStatus === 'ineligible'
                ? 'error'
                : match.eligibilityStatus === 'eligible'
                ? 'success'
                : 'warning'
            }
          >
            {match.eligibilityStatus.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      <ProgressBar value={match.matchPercentage} label="Weighted Match Score" />

      {match.disqualifyingConditions.length > 0 && (
        <div className="rounded-lg border border-status-error/30 bg-status-error/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-status-error">
            <AlertOctagon className="h-4 w-4" />
            Verified Disqualifying Conditions
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-text-primary">
            {match.disqualifyingConditions.map((d) => (
              <li key={d.label}>
                <strong>{d.label}:</strong> {d.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border-subtle bg-bg-secondary p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-status-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Hard Eligibility Passed ({match.hardPassed.length})
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-text-secondary">
            {match.hardPassed.length === 0 && <li>No confirmed hard criteria met yet.</li>}
            {match.hardPassed.map((f) => (
              <li key={f.label}>
                <span className="font-medium text-text-primary">{f.label}:</span> {f.detail}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border-subtle bg-bg-secondary p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-secondary">
            <ThumbsUp className="h-3.5 w-3.5" />
            Preference Alignment ({match.preferenceMatches.length})
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-text-secondary">
            {match.preferenceMatches.length === 0 && <li>No preference bonuses matched.</li>}
            {match.preferenceMatches.map((f) => (
              <li key={f.label}>
                <span className="font-medium text-text-primary">{f.label}:</span> {f.detail}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {match.missingRequirements.length > 0 && (
        <div className="rounded-lg border border-status-warning/30 bg-status-warning/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-status-warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            Missing / Unconfirmed Requirements ({match.missingRequirements.length})
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-text-secondary">
            {match.missingRequirements.map((m) => (
              <li key={m.label}>
                <span className="font-medium text-text-primary">{m.label}:</span> {m.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-border-subtle bg-bg-secondary p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Grounded Eligibility &amp; Preparation Advisor
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about eligibility, documents, or step-by-step preparation..."
            aria-label="Question about this scholarship"
          />
          <Button onClick={handleAnalyze} disabled={loadingAdvice} className="shrink-0">
            <Bot className="h-4 w-4" />
            {loadingAdvice ? 'Analyzing...' : 'Generate Plan'}
          </Button>
        </div>

        {guidance && (
          <div className="mt-3 space-y-2 border-t border-border-subtle pt-3 text-xs">
            <Badge variant={guidance.mode === 'ai_api' ? 'primary' : 'outline'}>
              {guidance.mode === 'ai_api'
                ? 'AI Grounded Explanation'
                : 'Deterministic Verified Eligibility Guide (No external AI API configured)'}
            </Badge>
            <p className="leading-relaxed text-text-primary">{guidance.summary}</p>
            <div>
              <p className="font-semibold text-text-primary">Preparation Steps</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-text-secondary">
                {guidance.preparationChecklist.slice(0, 6).map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-text-primary">Important Caveats</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-text-secondary">
                {guidance.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
