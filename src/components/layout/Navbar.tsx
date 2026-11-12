import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Menu,
  X,
  LayoutDashboard,
  Shield,
  LogOut,
  User,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge, Button } from '@/components/ui/Primitives';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { cn } from '@/lib/utils';

const PUBLIC_LINKS = [
  { to: '/scholarships', label: 'Scholarships' },
  { to: '/universities', label: 'Universities' },
  { to: '/countries', label: 'Countries' },
  { to: '/matcher', label: 'AI Matcher' },
  { to: '/calculator', label: 'Calculator' },
  { to: '/calendar', label: 'Calendar' },
];

const WORKSPACE_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/saved', label: 'Saved' },
  { to: '/applications', label: 'Applications' },
  { to: '/documents', label: 'Documents' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-lg px-2 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap',
      isActive
        ? 'bg-accent-primary/15 text-accent-primary'
        : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
    );

  return (
    <header className="sp-glass sticky top-0 z-40 border-b border-border-subtle">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="ScholarPath Home">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary text-white shadow-sm">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <span className="font-display text-base font-bold text-text-primary">
                ScholarPath
              </span>
              <span className="hidden whitespace-nowrap text-[11px] text-text-muted 2xl:block">
                Global Bachelor Planning
              </span>
            </div>
          </Link>

          <nav aria-label="Primary Navigation" className="hidden items-center gap-0.5 xl:flex">
            {PUBLIC_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Badge
            variant={session.mode === 'connected' ? 'success' : 'secondary'}
            className="hidden whitespace-nowrap 2xl:inline-flex"
            title={
              session.mode === 'connected'
                ? 'Connected to Supabase PostgreSQL & Auth'
                : 'Local Demo Mode (browser storage; verified catalog intact)'
            }
          >
            {session.mode === 'connected' ? 'Connected' : 'Demo Mode'}
          </Badge>

          <ThemeToggle />

          {session.authenticated ? (
            <div className="hidden items-center gap-0.5 xl:flex">
              <NavLink to="/dashboard" className={navLinkClass}>
                <span className="inline-flex items-center gap-1">
                  <LayoutDashboard className="hidden h-3.5 w-3.5 2xl:inline" />
                  Dashboard
                </span>
              </NavLink>
              <NavLink to="/saved" className={navLinkClass}>
                Saved
              </NavLink>
              <NavLink to="/applications" className={navLinkClass}>
                Tracker
              </NavLink>
              <NavLink to="/documents" className={navLinkClass}>
                Docs
              </NavLink>
              {session.role === 'admin' && (
                <NavLink to="/admin" className={navLinkClass}>
                  <span className="inline-flex items-center gap-1 text-status-warning">
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </span>
                </NavLink>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/profile')}
                aria-label="Student Profile"
              >
                <User className="h-3.5 w-3.5" />
                <span className="max-w-[72px] truncate">{session.displayName.split(' ')[0]}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 xl:flex">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Log in
              </Button>
              <Button size="sm" onClick={() => navigate('/onboarding')}>
                <Sparkles className="h-3.5 w-3.5" />
                Build Profile
              </Button>
            </div>
          )}

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface text-text-primary xl:hidden"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border-subtle bg-bg-secondary px-4 py-4 xl:hidden">
          <div className="mb-3 flex items-center justify-between">
            <Badge variant={session.mode === 'connected' ? 'success' : 'secondary'}>
              {session.mode === 'connected' ? 'Connected Mode' : 'Demo Mode'}
            </Badge>
            {session.authenticated && (
              <span className="text-xs text-text-secondary">{session.displayName}</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {PUBLIC_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={navLinkClass}
              >
                {link.label}
              </NavLink>
            ))}
            {session.authenticated &&
              WORKSPACE_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={navLinkClass}
                >
                  {link.label}
                </NavLink>
              ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border-subtle pt-3">
            {session.authenticated ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate('/profile');
                  }}
                >
                  Profile
                </Button>
                {session.role === 'admin' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setMobileOpen(false);
                      navigate('/admin');
                    }}
                  >
                    Admin CMS
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate('/login');
                  }}
                >
                  Log in
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate('/onboarding');
                  }}
                >
                  Build Profile
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
