import { Skeleton } from '@/components/ui/skeleton';

export default function HistoryLoading() {
  return (
    <div className='flex h-full flex-col overflow-y-auto p-4 pb-8 md:p-6'>
      <div className='mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-4 md:space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <Skeleton className='h-7 w-20 md:h-8 md:w-24' />
          <Skeleton className='h-8 w-24 rounded-md' />
        </div>

        {/* Tabs */}
        <div className='flex gap-6 border-b border-border'>
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className='mb-[-1px] h-8 w-32 rounded-none' />
          ))}
        </div>

        {/* Count + Filters */}
        <div className='flex items-center justify-between'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-4 w-16' />
        </div>

        {/* Filter Panel (collapsed skeleton) */}
        <Skeleton className='h-12 w-full rounded-lg' />

        {/* Table */}
        <div className='overflow-x-auto rounded-lg border border-border'>
          <div className='border-b border-border bg-muted/20 px-4 py-2.5'>
            <div className='flex gap-6'>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className='h-3 w-14' />
              ))}
            </div>
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='flex gap-6 border-b border-border/50 px-4 py-3'>
              {Array.from({ length: 8 }).map((_, j) => (
                <Skeleton key={j} className='h-3.5 w-14' />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
