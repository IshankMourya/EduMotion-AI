'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster, toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, Mail, Lock, User, Github, Chrome, AlertCircle, CheckCircle } from 'lucide-react';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ValidationError {
  field: string;
  message: string;
}

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validateForm = (): boolean => {
    const newErrors: ValidationError[] = [];

    if (!fullName.trim()) {
      newErrors.push({ field: 'fullName', message: 'Full name is required' });
    } else if (fullName.trim().length < 2) {
      newErrors.push({ field: 'fullName', message: 'Full name must be at least 2 characters' });
    }

    if (!email || !email.includes('@')) {
      newErrors.push({ field: 'email', message: 'Please enter a valid email address' });
    }

    if (!password || password.length < 8) {
      newErrors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    } else if (!/[A-Z]/.test(password)) {
      newErrors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
    } else if (!/[a-z]/.test(password)) {
      newErrors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
    } else if (!/[0-9]/.test(password)) {
      newErrors.push({ field: 'password', message: 'Password must contain at least one number' });
    }

    if (password !== confirmPassword) {
      newErrors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const getFieldError = (field: string): string | undefined => {
    return errors.find(e => e.field === field)?.message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) throw error;
      toast.success('Account created! Check your email to confirm.', {
        duration: 5000,
      });
      router.push(`/auth/login?redirect=${encodeURIComponent(redirectTo)}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'github' | 'google') => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  const passwordStrength = password.length === 0 ? 0 :
    password.length < 8 ? 1 :
    !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) ? 2 : 3;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Start creating educational videos with EduMotion AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => handleOAuth('github')}
              disabled={loading}
              className="gap-2"
            >
              <Github className="w-4 h-4" />
              GitHub
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOAuth('google')}
              disabled={loading}
              className="gap-2"
            >
              <Chrome className="w-4 h-4" />
              Google
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setErrors(prev => prev.filter(e => e.field !== 'fullName')); }}
                  required
                  disabled={loading}
                  className="pl-10"
                  autoComplete="name"
                  aria-invalid={!!getFieldError('fullName')}
                />
              </div>
              {getFieldError('fullName') && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {getFieldError('fullName')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(prev => prev.filter(e => e.field !== 'email')); }}
                  required
                  disabled={loading}
                  className="pl-10"
                  autoComplete="email"
                  aria-invalid={!!getFieldError('email')}
                />
              </div>
              {getFieldError('email') && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {getFieldError('email')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors(prev => prev.filter(e => e.field !== 'password')); }}
                  required
                  disabled={loading}
                  className="pl-10"
                  autoComplete="new-password"
                  aria-invalid={!!getFieldError('password')}
                />
              </div>
              {getFieldError('password') && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {getFieldError('password')}
                </p>
              )}
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${passwordStrength * 33.33}%`,
                    backgroundColor: passwordStrength === 1 ? '#ef4444' :
                      passwordStrength === 2 ? '#f59e0b' : '#22c55e'
                  }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {passwordStrength === 0 ? 'Enter a password' :
                  passwordStrength === 1 ? 'Weak - at least 8 characters' :
                  passwordStrength === 2 ? 'Medium - add uppercase, lowercase, number' : 'Strong'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors(prev => prev.filter(e => e.field !== 'confirmPassword')); }}
                  required
                  disabled={loading}
                  className="pl-10"
                  autoComplete="new-password"
                  aria-invalid={!!getFieldError('confirmPassword')}
                />
              </div>
              {getFieldError('confirmPassword') && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {getFieldError('confirmPassword')}
                </p>
              )}
              {confirmPassword && password === confirmPassword && password.length > 0 && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Passwords match
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </CardContent>
      </Card>
      <Toaster position="top-right" />
    </div>
  );
}