import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, CandlestickChart, Wallet, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function LandingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Authenticated users go straight to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className='flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/30'>
      {/* Navigation */}
      <header className='flex items-center justify-between border-b border-border px-6 py-4'>
        <div className='flex items-center gap-2'>
          <TrendingUp className='h-5 w-5 text-accent' />
          <span className='font-display text-sm font-semibold tracking-wide text-foreground'>
            KRAKEN SIMULATOR
          </span>
        </div>
        <div className='flex items-center gap-3'>
          <Link href='/sign-in'>
            <Button variant='ghost' size='sm' className='text-xs'>
              Sign In
            </Button>
          </Link>
          <Link href='/sign-up'>
            <Button size='sm' className='text-xs'>
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className='flex flex-1 flex-col items-center justify-center px-6 text-center'>
        <div className='mx-auto max-w-2xl space-y-8'>
          <div className='space-y-4'>
            <h1 className='font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl'>
              Learn to Trade.{' '}
              <span className='text-accent'>Risk-Free.</span>
            </h1>
            <p className='mx-auto max-w-md text-base leading-relaxed text-muted-foreground'>
              Practice spot and margin trading with $10,000 in virtual capital.
              Master 14 order types including advanced strategies — no real
              money involved.
            </p>
          </div>

          <div className='flex flex-col items-center gap-3 sm:flex-row sm:justify-center'>
            <Link href='/sign-up'>
              <Button size='lg' className='w-full sm:w-auto'>
                Start Trading Free
              </Button>
            </Link>
            <Link href='/sign-in'>
              <Button variant='outline' size='lg' className='w-full sm:w-auto'>
                Sign In
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className='grid grid-cols-1 gap-4 pt-8 sm:grid-cols-3'>
            <div className='rounded-lg border border-border/50 bg-muted/20 p-4 text-left'>
              <CandlestickChart className='mb-2 h-5 w-5 text-accent' />
              <h3 className='text-sm font-semibold text-foreground'>
                Advanced Trading
              </h3>
              <p className='mt-1 text-xs text-muted-foreground'>
                14 order types, margin up to 10x, real-time charts, and order
                book simulation.
              </p>
            </div>
            <div className='rounded-lg border border-border/50 bg-muted/20 p-4 text-left'>
              <Wallet className='mb-2 h-5 w-5 text-accent' />
              <h3 className='text-sm font-semibold text-foreground'>
                $10,000 Virtual Capital
              </h3>
              <p className='mt-1 text-xs text-muted-foreground'>
                Start with a simulated portfolio. Track P&L, equity curve, and
                performance analytics.
              </p>
            </div>
            <div className='rounded-lg border border-border/50 bg-muted/20 p-4 text-left'>
              <Shield className='mb-2 h-5 w-5 text-accent' />
              <h3 className='text-sm font-semibold text-foreground'>
                Education First
              </h3>
              <p className='mt-1 text-xs text-muted-foreground'>
                Built-in tutorials and interactive guides. Learn at your own
                pace with zero risk.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className='mt-12 pb-8 text-xs text-muted-foreground'>
          Educational purposes only. No real financial transactions or exchange
          connections.
        </p>
      </main>
    </div>
  );
}
