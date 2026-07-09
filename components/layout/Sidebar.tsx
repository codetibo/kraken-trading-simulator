'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth-client';
import {
  LayoutDashboard,
  CandlestickChart,
  Wallet,
  ListOrdered,
  Layers,
  History,
  GraduationCap,
  Settings,
  Activity,
  BarChart3,
  BookOpen,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface NavSection {
  labelKey: string;
  items: { href: string; labelKey: string; icon: React.ElementType }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: 'sectionTrading',
    items: [
      { href: '/trade', labelKey: 'trade', icon: CandlestickChart },
      { href: '/orders', labelKey: 'orders', icon: ListOrdered },
      { href: '/positions', labelKey: 'positions', icon: Layers },
    ],
  },
  {
    labelKey: 'sectionAnalytics',
    items: [
      { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
      { href: '/portfolio', labelKey: 'portfolio', icon: Wallet },
      { href: '/history', labelKey: 'history', icon: History },
    ],
  },
  {
    labelKey: 'sectionLearning',
    items: [
      { href: '/education', labelKey: 'education', icon: GraduationCap },
      { href: '/journal', labelKey: 'journal', icon: BookOpen },
    ],
  },
  {
    labelKey: 'sectionAdmin',
    items: [
      { href: '/backtest', labelKey: 'backtest', icon: BarChart3 },
      { href: '/settings', labelKey: 'settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isDark = mounted ? theme === 'dark' : true;

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/sign-in');
    router.refresh();
  };

  return (
    <aside className='flex w-[60px] flex-col items-center border-r border-border bg-panel py-3 md:w-[196px] md:items-stretch md:px-3'>
      <div className='mb-4 flex items-center gap-2 px-1 md:px-1.5'>
        <Activity className='h-5 w-5 shrink-0 text-accent' />
        <span className='hidden font-display text-sm font-semibold tracking-wide text-foreground md:inline'>
          {t('terminal')}
        </span>
      </div>

      <nav className='flex flex-1 flex-col gap-3'>
        {NAV_SECTIONS.map((section) => (
          <div key={section.labelKey}>
            {/* Section header — visible only on desktop */}
            <p className='mb-1 hidden px-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/40 md:block'>
              {t(section.labelKey)}
            </p>
            <div className='flex flex-col gap-0.5'>
              {section.items.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                      isActive
                        ? 'bg-panel-raised text-foreground'
                        : 'text-muted-foreground hover:bg-panel-raised/60 hover:text-foreground',
                    )}
                  >
                    <Icon
                      className={cn('h-4 w-4 shrink-0', isActive && 'text-accent')}
                    />
                    <span className='hidden md:inline'>{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={cn(
          'mb-2 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
          'text-muted-foreground hover:bg-panel-raised/60 hover:text-foreground',
          'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
        )}
      >
        {mounted ? (
          isDark ? (
            <Sun className='h-4 w-4 shrink-0' />
          ) : (
            <Moon className='h-4 w-4 shrink-0' />
          )
        ) : (
          <div className='h-4 w-4 shrink-0' />
        )}
        <span className='hidden md:inline'>
          {mounted ? (isDark ? t('lightMode') : t('darkMode')) : ''}
        </span>
      </button>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className={cn(
          'mb-2 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
          'text-muted-foreground hover:bg-panel-raised/60 hover:text-negative',
          'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
        )}
      >
        <LogOut className='h-4 w-4 shrink-0' />
        <span className='hidden md:inline'>{t('signOut')}</span>
      </button>

      <div className='hidden rounded-md border border-border bg-panel-raised/40 px-2.5 py-2 md:block'>
        <p className='text-[11px] leading-snug text-muted-foreground'>
          {t('disclaimer')}
        </p>
      </div>
    </aside>
  );
}
