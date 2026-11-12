import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border-subtle bg-bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary text-white">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="font-display text-base font-bold text-text-primary">ScholarPath</span>
            </div>
            <p className="text-xs leading-relaxed text-text-secondary">
              Discover Opportunities. Compare Universities. Build Your Future. Built for transparent
              undergraduate planning with verifiable official source citations.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              Discovery
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>
                <Link to="/scholarships" className="hover:text-text-primary">
                  Scholarship Discovery
                </Link>
              </li>
              <li>
                <Link to="/universities" className="hover:text-text-primary">
                  University Explorer
                </Link>
              </li>
              <li>
                <Link to="/compare/universities" className="hover:text-text-primary">
                  University Comparison
                </Link>
              </li>
              <li>
                <Link to="/countries" className="hover:text-text-primary">
                  Destination Countries
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              Planning Tools
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>
                <Link to="/matcher" className="hover:text-text-primary">
                  Eligibility Matcher
                </Link>
              </li>
              <li>
                <Link to="/calculator" className="hover:text-text-primary">
                  Financial Calculator
                </Link>
              </li>
              <li>
                <Link to="/calendar" className="hover:text-text-primary">
                  Deadline Calendar
                </Link>
              </li>
              <li>
                <Link to="/applications" className="hover:text-text-primary">
                  Application Tracker
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              Data Verification Policy
            </h3>
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-status-success" />
              <span>
                Every official record links directly to university or government portals with a
                verified date. Synthetic demo examples are explicitly labeled. Always confirm exact
                annual deadlines on the official portal.
              </span>
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-border-subtle pt-6 text-xs text-text-muted sm:flex-row sm:items-center">
          <p>ScholarPath Open-Source Higher Education Planning Platform (MIT License).</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-text-primary">
              Account &amp; Demo Controls
            </Link>
            <Link to="/admin" className="hover:text-text-primary">
              Admin Verification CMS
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
