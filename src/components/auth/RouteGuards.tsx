import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card } from '@/components/ui/Primitives';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-text-secondary">
        Verifying session...
      </div>
    );
  }

  if (!session.authenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-text-secondary">
        Verifying administrator authorization...
      </div>
    );
  }

  if (!session.authenticated) {
    return <Navigate to="/login?redirect=%2Fadmin" replace />;
  }

  if (session.role !== 'admin') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card className="border-status-error/40 text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-status-error" />
          <h1 className="text-xl font-bold text-text-primary">403 — Administrator Access Required</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Your current account (<span className="font-mono">{session.email}</span>) has role{' '}
            <span className="font-semibold text-text-primary">{session.role}</span>. Modifying
            verified scholarships, universities, or data imports requires administrator
            authorization enforced by Row Level Security.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
            <Link to="/login?redirect=%2Fadmin">
              <Button>Switch Account</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
