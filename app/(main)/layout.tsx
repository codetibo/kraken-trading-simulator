import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { WorkerTick } from '@/components/WorkerTick';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { QuickActions } from '@/components/layout/QuickActions';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingProvider>
      <div className='flex h-screen w-full overflow-hidden'>
        <Sidebar />
        <div className='flex min-w-0 flex-1 flex-col'>
          <TopBar />
          <main className='flex-1 overflow-hidden'>
            <ErrorBoundary label='page'>
              {children}
            </ErrorBoundary>
          </main>
        </div>
        <WorkerTick intervalMs={1500} />
        <QuickActions />
      </div>
    </OnboardingProvider>
  );
}
