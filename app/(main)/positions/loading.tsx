import { Skeleton } from '@/components/ui/skeleton';

export default function PositionsLoading() {
  return (
    <div className='flex h-full flex-col overflow-y-auto p-4 pb-8 md:p-6'>
      <div className='mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-4 md:space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <Skeleton className='h-7 w-24 md:h-8 md:w-28' />
          <Skeleton className='h-8 w-24 rounded-md' />
        </div>

        {/* Summary Cards */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-28 w-full rounded-xl' />
          ))}
        </div>

        {/* Table */}
        <div className='overflow-x-auto rounded-lg border border-border'>
          <div className='border-b border-border bg-muted/20 px-4 py-2.5'>
            <div className='flex gap-6'>
              {Array.from({ length: 11 }).map((_, i) => (
                <Skeleton key={i} className='h-3 w-14' />
              ))}
            </div>
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='flex gap-6 border-b border-border/50 px-4 py-3'>
              {Array.from({ length: 11 }).map((_, j) => (
                <Skeleton key={j} className='h-3.5 w-14' />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
