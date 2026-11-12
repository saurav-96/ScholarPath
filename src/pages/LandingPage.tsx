import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  Compass,
  Globe2,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { ScholarshipCard } from '@/components/scholarship/ScholarshipCard';
import { Badge, Button, Card, Input, Select } from '@/components/ui/Primitives';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import { evaluateScholarshipMatch } from '@/lib/matching';

const FAQ_ITEMS = [
  {
    q: 'Does "Full Tuition" mean a scholarship is fully funded?',
    a: 'No. Full tuition waivers cover university tuition fees only. A genuinely fully funded undergraduate scholarship also covers living expenses (stipend or housing/meals) and sometimes travel or health insurance. ScholarPath separates every coverage item explicitly.',
  },
  {
    q: 'Can I use ScholarPath without creating an external database account?',
    a: 'Yes. ScholarPath runs smoothly in Demo Mode using local browser storage and our verified undergraduate dataset. When Supabase credentials are configured, authentication, Row Level Security, and cloud persistence activate automatically.',
  },
  {
    q: 'How does ScholarPath verify scholarship and university details?',
    a: 'Every official record links directly to the university admissions portal, regional agency (such as Italian DSU agencies), or national government portal (MEXT, GKS, Study in NL, DAAD) with a recorded verification date. Any non-official walkthrough examples are strictly tagged as Synthetic Demo.',
  },
  {
    q: 'Does ScholarPath submit applications directly to universities?',
    a: 'No. ScholarPath helps you research eligibility, organize documents, track personal deadlines, and calculate affordability. Official applications must always be submitted on the university or government portal linked on each detail page.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { scholarships, universities, countries } = useCatalogData();
  const { userState, toggleSavedScholarship } = useUserWorkspace();

  const [degreeLevel, setDegreeLevel] = useState("Bachelor's");
  const [countryCode, setCountryCode] = useState('ALL');
  const [subject, setSubject] = useState('');
  const [funding, setFunding] = useState('ALL');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const officialScholarships = useMemo(
    () => scholarships.filter((s) => s.recordKind === 'official' && !s.isArchived),
    [scholarships],
  );

  const stats = useMemo(() => {
    const fullyFundedCount = officialScholarships.filter(
      (s) => s.fundingTier === 'fully_funded',
    ).length;
    const noAppFeeCount = officialScholarships.filter((s) => s.applicationFeeAmount === 0).length;
    return {
      verifiedScholarships: officialScholarships.length,
      fullyFundedCount,
      universitiesCount: universities.length,
      countriesCount: countries.length,
      noAppFeeCount,
    };
  }, [officialScholarships, universities.length, countries.length]);

  const featuredScholarships = useMemo(() => {
    return officialScholarships
      .filter((s) => s.fundingTier === 'fully_funded' || s.fundingTier === 'full_tuition')
      .slice(0, 6);
  }, [officialScholarships]);

  const savedSet = useMemo(
    () => new Set(userState?.savedScholarships.map((s) => s.scholarshipId) ?? []),
    [userState],
  );

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (degreeLevel && degreeLevel !== 'ALL') params.set('degree', degreeLevel);
    if (countryCode && countryCode !== 'ALL') params.set('country', countryCode);
    if (subject.trim()) params.set('q', subject.trim());
    if (funding && funding !== 'ALL') params.set('funding', funding);
    navigate(`/scholarships?${params.toString()}`);
  };

  return (
    <div className="pb-12">
      <PageMeta
        title="ScholarPath — Discover Opportunities. Compare Universities. Build Your Future."
        description="Discover verified international undergraduate scholarships, compare university affordability across 16 countries, and organize your applications."
      />

      {/* Hero Section */}
      <section className="sp-grid-bg relative border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mx-auto max-w-3xl text-center"
          >
            <Badge variant="primary" className="mb-4 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Source-Verified International Bachelor&apos;s Planning
            </Badge>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
              Your Global Education Journey Starts Here.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
              Discover scholarships, compare universities, and find opportunities that make studying
              abroad affordable.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link to="/scholarships">
                <Button size="lg" className="px-6">
                  Explore Scholarships
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/onboarding">
                <Button size="lg" variant="outline" className="px-6">
                  <Sparkles className="h-4 w-4 text-accent-secondary" />
                  Build My Student Profile
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Interactive Search Bar */}
          <form
            onSubmit={handleHeroSearch}
            aria-label="Search scholarships"
            className="sp-card mx-auto mt-10 max-w-5xl border-border-strong bg-bg-surface/95 p-4 shadow-soft"
          >
            <div className="grid gap-3 md:grid-cols-5">
              <div>
                <label htmlFor="hero-degree" className="mb-1 block text-xs font-medium text-text-secondary">
                  Degree Level
                </label>
                <Select
                  id="hero-degree"
                  value={degreeLevel}
                  onChange={(e) => setDegreeLevel(e.target.value)}
                >
                  <option value="Bachelor's">Bachelor&apos;s</option>
                  <option value="ALL">All Supported Degrees</option>
                </Select>
              </div>

              <div>
                <label htmlFor="hero-country" className="mb-1 block text-xs font-medium text-text-secondary">
                  Destination Country
                </label>
                <Select
                  id="hero-country"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  <option value="ALL">All 16 Countries</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label htmlFor="hero-subject" className="mb-1 block text-xs font-medium text-text-secondary">
                  Subject or Keyword
                </label>
                <Input
                  id="hero-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Computer Science, DSU"
                />
              </div>

              <div>
                <label htmlFor="hero-funding" className="mb-1 block text-xs font-medium text-text-secondary">
                  Funding Type
                </label>
                <Select
                  id="hero-funding"
                  value={funding}
                  onChange={(e) => setFunding(e.target.value)}
                >
                  <option value="ALL">Any Funding Type</option>
                  <option value="fully_funded">Fully Funded</option>
                  <option value="full_tuition">Full Tuition</option>
                  <option value="partial_tuition">Partial Tuition</option>
                  <option value="living_stipend">Living Stipend</option>
                </Select>
              </div>

              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Real Dataset Opportunity Statistics (Never Fabricated) */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary">Verified Scholarships</p>
              <p className="mt-1 font-display text-2xl font-bold text-text-primary">
                {stats.verifiedScholarships}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">Official URLs &amp; dates audited</p>
            </div>
            <Award className="h-8 w-8 text-accent-primary" />
          </Card>
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary">Fully Funded Awards</p>
              <p className="mt-1 font-display text-2xl font-bold text-status-success">
                {stats.fullyFundedCount}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">Tuition + living support confirmed</p>
            </div>
            <Wallet className="h-8 w-8 text-status-success" />
          </Card>
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary">Cataloged Universities</p>
              <p className="mt-1 font-display text-2xl font-bold text-text-primary">
                {stats.universitiesCount}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">Side-by-side fee comparison</p>
            </div>
            <Compass className="h-8 w-8 text-accent-secondary" />
          </Card>
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-secondary">Destination Countries</p>
              <p className="mt-1 font-display text-2xl font-bold text-text-primary">
                {stats.countriesCount}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {stats.noAppFeeCount} zero-fee scholarships
              </p>
            </div>
            <Globe2 className="h-8 w-8 text-accent-primary" />
          </Card>
        </div>
      </section>

      {/* Featured Scholarships */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary">
              Featured Verified Undergraduate Scholarships
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Evaluated against your active student profile ({userState?.profile.countryOfOrigin ?? 'Nepal'} •{' '}
              {userState?.profile.intendedDegree ?? "Bachelor's"}).
            </p>
          </div>
          <Link to="/scholarships">
            <Button variant="outline" size="sm">
              Browse All Scholarships
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {featuredScholarships.map((sch) => (
            <ScholarshipCard
              key={sch.id}
              scholarship={sch}
              match={
                userState?.profile
                  ? evaluateScholarshipMatch(sch, userState.profile)
                  : undefined
              }
              isSaved={savedSet.has(sch.id)}
              onToggleSave={(id) => toggleSavedScholarship({ scholarshipId: id })}
            />
          ))}
        </div>
      </section>

      {/* Explore Countries */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary">
              Explore Study Destinations
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Honest tuition realities, living benchmarks, and official national portals across 16 countries.
            </p>
          </div>
          <Link to="/countries">
            <Button variant="outline" size="sm">
              View All 16 Countries
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {countries.slice(0, 8).map((c) => {
            const schCount = officialScholarships.filter((s) => s.countryCode === c.code).length;
            const uniCount = universities.filter((u) => u.countryCode === c.code).length;
            return (
              <Link key={c.code} to={`/countries/${c.slug}`}>
                <Card className="sp-card-hover h-full space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary">{c.name}</span>
                    <Badge variant="outline">{c.code}</Badge>
                  </div>
                  <p className="line-clamp-2 text-xs text-text-secondary">{c.tuitionOverview}</p>
                  <div className="flex items-center gap-3 pt-1 text-xs text-text-muted">
                    <span>{uniCount} Universities</span>
                    <span>•</span>
                    <span>{schCount} Scholarships</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How ScholarPath Works + Coverage Clarity */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4">
            <h2 className="font-display text-xl font-bold text-text-primary">
              How ScholarPath Works
            </h2>
            <div className="space-y-4">
              {[
                {
                  step: '01',
                  title: 'Configure Your Academic & Financial Profile',
                  desc: 'Enter your citizenship, expected GPA (0–4.0), independent test plans (IELTS, TOEFL, PTE, Duolingo, SAT), and funding needs.',
                },
                {
                  step: '02',
                  title: 'Inspect Transparent Eligibility & Real Costs',
                  desc: 'Hard disqualifiers are never hidden behind preference scores. Compare university fees and calculate annual out-of-pocket gaps.',
                },
                {
                  step: '03',
                  title: 'Organize Documents, Tasks & Deadlines',
                  desc: 'Track personal application stages, legalizations, motivation letters, and timezone-aware deadlines in one workspace.',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-primary/15 font-mono text-xs font-bold text-accent-primary">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-display text-xl font-bold text-text-primary">
              Understanding Scholarship Coverage
            </h2>
            <p className="text-sm text-text-secondary">
              Many scholarships advertise high headline values while omitting living costs. ScholarPath
              breaks every award into five verifiable categories:
            </p>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2 rounded-lg border border-border-subtle bg-bg-secondary p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success" />
                <div>
                  <span className="font-semibold text-text-primary">Fully Funded:</span> Confirmed
                  tuition coverage PLUS verified living stipend/housing (e.g., MEXT, GKS, Reach
                  Oxford, Italian Regional DSU, Padua Excellence).
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border-subtle bg-bg-secondary p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" />
                <div>
                  <span className="font-semibold text-text-primary">Full Tuition Only:</span> Covers
                  100% of tuition fees (e.g., Aalto Scholarship, Sydney Excellence, Émile Boutmy full
                  grant), leaving €10,000–€25,000+/yr living expenses self-funded.
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-border-subtle bg-bg-secondary p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-secondary" />
                <div>
                  <span className="font-semibold text-text-primary">
                    Partial / Conditional / Stipend:
                  </span>{' '}
                  First-year offsets (NL €5,000 grant), €300/mo Deutschlandstipendium, or income/merit
                  fee waivers (TUM, Bristol Think Big).
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="text-center font-display text-2xl font-bold text-text-primary">
          Frequently Asked Questions
        </h2>
        <div className="mt-6 space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <Card key={item.q} className="p-0">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-text-primary">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-text-secondary transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-border-subtle px-5 py-3.5 text-sm leading-relaxed text-text-secondary">
                    {item.a}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
