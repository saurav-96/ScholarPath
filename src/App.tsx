import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminRoute, ProtectedRoute } from '@/components/auth/RouteGuards';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AppShell } from '@/components/layout/AppShell';
import { CardGridSkeleton } from '@/components/ui/Skeleton';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { getAppEnv } from '@/lib/env';

// Code-split routes cleanly so initial bundle stays lean and static pages load fast
const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const LoginPage = lazy(() =>
  import('@/pages/auth/AuthPages').then((m) => ({ default: m.LoginPage })),
);
const SignupPage = lazy(() =>
  import('@/pages/auth/AuthPages').then((m) => ({ default: m.SignupPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/AuthPages').then((m) => ({ default: m.ForgotPasswordPage })),
);
const OnboardingPage = lazy(() =>
  import('@/pages/auth/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/auth/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const ScholarshipsPage = lazy(() =>
  import('@/pages/ScholarshipsPage').then((m) => ({ default: m.ScholarshipsPage })),
);
const ScholarshipDetailPage = lazy(() =>
  import('@/pages/ScholarshipDetailPage').then((m) => ({ default: m.ScholarshipDetailPage })),
);
const UniversitiesPage = lazy(() =>
  import('@/pages/UniversitiesPage').then((m) => ({ default: m.UniversitiesPage })),
);
const UniversityDetailPage = lazy(() =>
  import('@/pages/UniversityDetailPage').then((m) => ({ default: m.UniversityDetailPage })),
);
const UniversityComparePage = lazy(() =>
  import('@/pages/UniversityComparePage').then((m) => ({ default: m.UniversityComparePage })),
);
const CountriesPage = lazy(() =>
  import('@/pages/CountriesPage').then((m) => ({ default: m.CountriesPage })),
);
const CountryDetailPage = lazy(() =>
  import('@/pages/CountryDetailPage').then((m) => ({ default: m.CountryDetailPage })),
);
const MatcherPage = lazy(() =>
  import('@/pages/MatcherPage').then((m) => ({ default: m.MatcherPage })),
);
const CalculatorPage = lazy(() =>
  import('@/pages/CalculatorPage').then((m) => ({ default: m.CalculatorPage })),
);
const CalendarPage = lazy(() =>
  import('@/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const SavedPage = lazy(() =>
  import('@/pages/SavedPage').then((m) => ({ default: m.SavedPage })),
);
const ApplicationsPage = lazy(() =>
  import('@/pages/ApplicationsPage').then((m) => ({ default: m.ApplicationsPage })),
);
const DocumentsPage = lazy(() =>
  import('@/pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })),
);
const AdminPage = lazy(() =>
  import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

function RouteLoadingFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <CardGridSkeleton count={6} />
    </div>
  );
}

export function AppRoutes() {
  return (
    <AppShell>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          <Route path="/scholarships" element={<ScholarshipsPage />} />
          <Route path="/scholarships/:slug" element={<ScholarshipDetailPage />} />
          <Route path="/universities" element={<UniversitiesPage />} />
          <Route path="/universities/:slug" element={<UniversityDetailPage />} />
          <Route path="/compare/universities" element={<UniversityComparePage />} />
          <Route path="/countries" element={<CountriesPage />} />
          <Route path="/countries/:slug" element={<CountryDetailPage />} />
          <Route path="/matcher" element={<MatcherPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/calendar" element={<CalendarPage />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <ApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export function App() {
  const { basePath } = getAppEnv();
  const normalizedBase = basePath === '/' ? '/' : basePath.replace(/\/+$/, '');

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <BrowserRouter basename={normalizedBase}>
                <AppRoutes />
              </BrowserRouter>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
export default App;
