'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html>
      <body>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--background, #fafafa)',
            color: 'var(--foreground, #1a1a1a)',
            fontFamily: 'system-ui, sans-serif',
            padding: '1rem',
          }}
        >
          <ErrorFallback
            message='A critical error occurred.'
            error={error}
            onRetry={reset}
            hideHomeLink
            action={
              <a
                href='/dashboard'
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  border: '1px solid var(--border, #d4d4d4)',
                  color: 'var(--foreground, #1a1a1a)',
                  textDecoration: 'none',
                }}
              >
                Go to Dashboard
              </a>
            }
          />
        </div>
      </body>
    </html>
  );
}
