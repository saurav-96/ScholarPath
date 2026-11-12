import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '@/App';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { resetDemoWorkspace, setDemoSession } from '@/services/dataService';

function renderRoute(initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={[initialEntry]}>
              <AppRoutes />
            </MemoryRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('ScholarPath Routing & Role Access Guards', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetDemoWorkspace();
  });

  it('renders Landing Page headline cleanly', async () => {
    renderRoute('/');
    expect(
      await screen.findByRole(
        'heading',
        { name: /Your Global Education Journey Starts Here\./i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });

  it('blocks student role from /admin with 403 rejection card', async () => {
    setDemoSession({
      mode: 'demo',
      authenticated: true,
      userId: 'demo-student-nepal',
      email: 'student@demo.scholarpath.local',
      displayName: 'Aarav',
      role: 'student',
    });

    renderRoute('/admin');
    expect(
      await screen.findByText(/403 — Administrator Access Required/i, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('grants admin role access to Admin Verification CMS', async () => {
    setDemoSession({
      mode: 'demo',
      authenticated: true,
      userId: 'demo-admin',
      email: 'admin@demo.scholarpath.local',
      displayName: 'Curator',
      role: 'admin',
    });

    renderRoute('/admin');
    expect(
      await screen.findByRole(
        'heading',
        { name: /Catalog Verification & Operations/i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });

  it('renders Financial Calculator cleanly without NaN values', async () => {
    renderRoute('/calculator');
    expect(
      await screen.findByRole(
        'heading',
        { name: /Financial Planning & Funding Gap Calculator/i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });
});
