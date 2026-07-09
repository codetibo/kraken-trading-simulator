'use client';

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ErrorFallbackProps {
  /** User-friendly message describing what went wrong */
  message?: string;
  /** Optional — the original Error object; shown in a collapsible detail block */
  error?: Error | null;
  /** Called when the user clicks "Try again" */
  onRetry?: () => void;
  /** If true, hides the "Go to Dashboard" link */
  hideHomeLink?: boolean;
  /** Optional extra action button */
  action?: React.ReactNode;
}

export function ErrorFallback({
  message = 'Something went wrong.',
  error,
  onRetry,
  hideHomeLink = false,
  action,
}: ErrorFallbackProps) {
  return (
    <div className='flex min-h-[200px] w-full items-center justify-center p-4'>
      <Card size='sm' className='w-full max-w-sm'>
        <CardHeader className='items-center gap-3 pb-2 pt-6 text-center'>
          <div className='flex size-12 shrink-0 items-center justify-center rounded-full bg-destructive/10'>
            <AlertTriangle className='size-6 text-destructive' />
          </div>
          <div>
            <h2 className='font-heading text-base font-medium text-foreground'>
              {message}
            </h2>
            <p className='mt-1 text-xs text-muted-foreground'>
              An unexpected error occurred. Please try again.
            </p>
          </div>
        </CardHeader>

        <CardContent className='flex flex-col items-center gap-3 pb-6'>
          <div className='flex flex-wrap items-center justify-center gap-2'>
            {onRetry && (
              <Button variant='default' size='sm' onClick={onRetry}>
                <RefreshCw className='mr-1 size-3.5' />
                Try Again
              </Button>
            )}
            {action}
            {!hideHomeLink && (
              <Link href='/dashboard'>
                <Button variant='outline' size='sm'>
                  <Home className='mr-1 size-3.5' />
                  Dashboard
                </Button>
              </Link>
            )}
          </div>

          {error && (
            <details className='w-full max-w-xs'>
              <summary className='cursor-pointer text-xs text-muted-foreground hover:text-foreground'>
                Error details
              </summary>
              <pre className='mt-1 max-h-24 overflow-auto rounded-md bg-muted p-2 text-[11px] leading-relaxed text-muted-foreground'>
                {error.name}: {error.message}
                {error.stack && `\n${error.stack.split('\n').slice(0, 3).join('\n')}`}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
