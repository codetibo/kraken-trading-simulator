import { TickerTape } from '@/components/ticker/TickerTape';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/server/actions/orders';
import { formatUsd } from '@/lib/utils';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { KeyboardShortcutsButton } from '@/components/layout/KeyboardShortcutsButton';
import { getTranslations } from 'next-intl/server';

export async function TopBar() {
  const t = await getTranslations('topbar');
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = await getCurrentUserId();
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  const startingBalance = wallet ? Number(wallet.startingBalance) : 10000;

  return (
    <header className='flex flex-col border-b border-border bg-panel'>
      <div className='flex items-center justify-between px-4 py-2'>
        <div className='flex items-center gap-2'>
          <span className='relative flex h-2 w-2'>
            <span className='absolute inline-flex h-full w-full animate-pulse-glow rounded-full bg-positive opacity-75' />
            <span className='relative inline-flex h-2 w-2 rounded-full bg-positive' />
          </span>
          <span className='text-xs text-muted-foreground'>
            {t('simulationRunning')}
          </span>
        </div>
        <div className='flex items-center gap-3'>
          <span className='text-xs text-muted-foreground'>
            {session?.user?.name && (
              <span className='text-foreground'>{session.user.name}</span>
            )}
          </span>
          <span className='font-mono text-xs text-muted-foreground'>
            {t('capital')}:{' '}
            <span className='text-foreground'>{formatUsd(startingBalance)}</span>
          </span>
          <KeyboardShortcutsButton />
        </div>
      </div>
      <TickerTape />
    </header>
  );
}
