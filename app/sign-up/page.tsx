'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await authClient.signUp.email({
        name: name || email.split('@')[0],
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message || 'Registration failed');
        return;
      }

      setSuccess(true);

      // Auto-redirect to dashboard after successful sign-up + sign-in
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4'>
      <div className='w-full max-w-sm space-y-6'>
        {/* Logo / Brand */}
        <div className='flex flex-col items-center space-y-2 text-center'>
          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10'>
            <TrendingUp className='h-6 w-6 text-accent' />
          </div>
          <h1 className='text-xl font-semibold tracking-tight text-foreground'>
            Kraken Simulator
          </h1>
          <p className='text-sm text-muted-foreground'>
            Create your trading account
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader className='pb-4'>
              <CardTitle className='text-base'>Create Account</CardTitle>
              <CardDescription className='text-xs'>
                Start with $10,000 in simulated capital
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4 pb-4'>
              {error && (
                <div className='flex items-start gap-2 rounded-md border border-negative/20 bg-negative/5 p-3 text-xs text-negative'>
                  <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className='flex items-start gap-2 rounded-md border border-positive/20 bg-positive/5 p-3 text-xs text-positive'>
                  <CheckCircle2 className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                  <span>Account created! Redirecting...</span>
                </div>
              )}

              <div className='space-y-2'>
                <Label htmlFor='name' className='text-xs font-medium'>
                  Display Name
                </Label>
                <Input
                  id='name'
                  type='text'
                  placeholder='Trader Name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete='name'
                  className='h-9 text-sm'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='email' className='text-xs font-medium'>
                  Email
                </Label>
                <Input
                  id='email'
                  type='email'
                  placeholder='you@example.com'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete='email'
                  className='h-9 text-sm'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='password' className='text-xs font-medium'>
                  Password
                </Label>
                <Input
                  id='password'
                  type='password'
                  placeholder='At least 6 characters'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete='new-password'
                  className='h-9 text-sm'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='confirmPassword' className='text-xs font-medium'>
                  Confirm Password
                </Label>
                <Input
                  id='confirmPassword'
                  type='password'
                  placeholder='Repeat your password'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete='new-password'
                  className='h-9 text-sm'
                />
              </div>
            </CardContent>
            <CardFooter className='flex flex-col gap-3'>
              <Button
                type='submit'
                className='w-full'
                disabled={loading || success}
              >
                {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
              <p className='text-xs text-muted-foreground'>
                Already have an account?{' '}
                <Link
                  href='/sign-in'
                  className='font-medium text-accent hover:text-accent/80 transition-colors'
                >
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
