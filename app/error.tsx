'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className='flex h-full w-full items-center justify-center'>
      <ErrorFallback
        message='Something went wrong loading this page.'
        error={error}
        onRetry={reset}
      />
    </div>
  );
}
