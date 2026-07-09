'use client';

import { CandlestickChart } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  message: string;
  icon?: React.ElementType;
}

export function EmptyState({ message, icon: Icon }: EmptyStateProps) {
  return (
    <div className='flex flex-col items-center justify-center py-8'>
      {Icon && <Icon className='mb-2 h-8 w-8 text-muted-foreground/30' />}
      <p className='text-sm text-muted-foreground mb-3'>{message}</p>
      <Link
        href='/trade'
        className='inline-flex h-6 items-center gap-1 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground'
      >
        <CandlestickChart className='h-3 w-3' />
        Trade
      </Link>
    </div>
  );
}
