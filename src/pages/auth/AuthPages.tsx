import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, ShieldCheck, UserCheck, AlertCircle, RotateCcw } from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { Badge, Button, Card, Input } from '@/components/ui/Primitives';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { loginSchema, resetPasswordSchema, signupSchema } from '@/schemas/validation';
import type { z } from 'zod';

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;
type ResetForm = z.infer<typeof resetPasswordSchema>;

export function LoginPage() {
  const { session, signIn, continueAsDemo, resetDemo } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginForm) => {
    setAuthError(null);
    try {
      await signIn(values.email, values.password);
      pushToast({ title: 'Signed in successfully', variant: 'success' });
      navigate(redirect, { replace: true });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to sign in');
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageMeta
        title="Sign In"
        description="Sign in to ScholarPath or explore in local Demo Mode."
      />
      <Card className="space-y-5">
        <div>
          <Badge variant={session.mode === 'connected' ? 'success' : 'secondary'}>
            {session.mode === 'connected' ? 'Supabase Auth Connected' : 'Local Demo Mode Active'}
          </Badge>
          <h1 className="mt-2 font-display text-2xl font-bold text-text-primary">
            Sign in to ScholarPath
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Access your saved opportunities, eligibility matcher, and application tracker.
          </p>
        </div>

        {authError && (
          <div className="flex items-start gap-2 rounded-lg border border-status-error/30 bg-status-error/10 p-3 text-xs text-status-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-xs font-medium text-text-secondary">
              Email Address
            </label>
            <Input id="login-email" type="email" placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-status-error">{errors.email.message}</p>}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="login-password" className="text-xs font-medium text-text-secondary">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-accent-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="login-password" type="password" {...register('password')} />
            {errors.password && (
              <p className="mt-1 text-xs text-status-error">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <KeyRound className="h-4 w-4" />
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        {session.mode === 'demo' && (
          <div className="space-y-2.5 border-t border-border-subtle pt-4">
            <p className="text-xs font-medium text-text-secondary">
              Quick Demo Access (no backend credentials configured):
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  continueAsDemo('student');
                  pushToast({ title: 'Active: Nepal Bachelor Student Demo', variant: 'info' });
                  navigate(redirect);
                }}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Student Demo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  continueAsDemo('admin');
                  pushToast({
                    title: 'Admin Sandbox Session Active',
                    description: 'Changes stay in your browser local sandbox only.',
                    variant: 'warning',
                  });
                  navigate('/admin');
                }}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-status-warning" />
                Admin Sandbox
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                resetDemo();
                pushToast({ title: 'Demo workspace reset to default Nepal profile', variant: 'info' });
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Local Demo Data
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-text-secondary">
          New to ScholarPath?{' '}
          <Link to="/signup" className="font-medium text-accent-primary hover:underline">
            Create a student account
          </Link>
        </p>
      </Card>
    </div>
  );
}

export function SignupPage() {
  const { signUp, session } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (values: SignupForm) => {
    setError(null);
    try {
      const res = await signUp(values.displayName, values.email, values.password);
      if (res.needsVerification) {
        pushToast({
          title: 'Check your email to confirm your account',
          description: 'Once confirmed, log in to start onboarding.',
          variant: 'info',
        });
        navigate('/login');
      } else {
        pushToast({ title: 'Account created — complete your student profile', variant: 'success' });
        navigate('/onboarding');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account');
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageMeta title="Create Account" description="Register for ScholarPath student planning." />
      <Card className="space-y-5">
        <div>
          <Badge variant={session.mode === 'connected' ? 'success' : 'secondary'}>
            {session.mode === 'connected' ? 'Supabase Connected' : 'Demo Mode'}
          </Badge>
          <h1 className="mt-2 font-display text-2xl font-bold text-text-primary">
            Create Student Account
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Save scholarships, track applications, and get personalized eligibility scores.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-status-error/30 bg-status-error/10 p-3 text-xs text-status-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="signup-name" className="mb-1 block text-xs font-medium text-text-secondary">
              Full Name or Display Name
            </label>
            <Input id="signup-name" placeholder="e.g. Aarav Shrestha" {...register('displayName')} />
            {errors.displayName && (
              <p className="mt-1 text-xs text-status-error">{errors.displayName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="signup-email" className="mb-1 block text-xs font-medium text-text-secondary">
              Email Address
            </label>
            <Input id="signup-email" type="email" placeholder="student@example.com" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-status-error">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="signup-password" className="mb-1 block text-xs font-medium text-text-secondary">
              Password (8+ characters)
            </label>
            <Input id="signup-password" type="password" {...register('password')} />
            {errors.password && (
              <p className="mt-1 text-xs text-status-error">{errors.password.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="signup-confirm" className="mb-1 block text-xs font-medium text-text-secondary">
              Confirm Password
            </label>
            <Input id="signup-confirm" type="password" {...register('confirmPassword')} />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-status-error">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create Account & Start Onboarding'}
          </Button>
        </form>

        <p className="text-center text-xs text-text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { requestPasswordReset, session } = useAuth();
  const { pushToast } = useToast();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (values: ResetForm) => {
    await requestPasswordReset(values.email);
    setSent(true);
    pushToast({
      title:
        session.mode === 'connected'
          ? 'Password reset email sent if account exists'
          : 'Demo mode: use Student Demo or Admin Sandbox on login page',
      variant: 'info',
    });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageMeta title="Recover Password" description="Reset your ScholarPath password." />
      <Card className="space-y-4">
        <h1 className="font-display text-2xl font-bold text-text-primary">Password Recovery</h1>
        <p className="text-sm text-text-secondary">
          Enter your email to receive a password reset link when connected to Supabase Auth.
        </p>

        {sent ? (
          <div className="rounded-lg border border-status-success/30 bg-status-success/10 p-3 text-sm text-status-success">
            If your account is configured with Supabase Auth, check your inbox for the reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="mb-1 block text-xs font-medium text-text-secondary">
                Email Address
              </label>
              <Input id="reset-email" type="email" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-status-error">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Send Recovery Email
            </Button>
          </form>
        )}

        <Link to="/login" className="block text-center text-xs text-accent-primary hover:underline">
          Return to Login
        </Link>
      </Card>
    </div>
  );
}
