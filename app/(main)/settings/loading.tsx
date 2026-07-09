import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className='flex h-full flex-col overflow-y-auto p-4 pb-8 md:p-6'>
      <div className='mx-auto flex w-full max-w-3xl flex-1 flex-col space-y-4 md:space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <Skeleton className='h-7 w-24 md:h-8 md:w-28' />
        </div>

        {/* Account Card */}
        <Skeleton className='h-64 w-full rounded-xl' />

        {/* Appearance Card */}
        <Skeleton className='h-36 w-full rounded-xl' />

        {/* Preferences Card */}
        <Skeleton className='h-36 w-full rounded-xl' />

        {/* Simulation Card */}
        <Skeleton className='h-56 w-full rounded-xl' />

        {/* Danger Zone Card */}
        <Skeleton className='h-32 w-full rounded-xl border-negative/20' />
      </div>
    </div>
  );
}
