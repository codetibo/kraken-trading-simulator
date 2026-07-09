import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className='h-full overflow-y-auto p-4 pb-8 md:p-6'>
      <div className='mx-auto max-w-7xl space-y-4 md:space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <Skeleton className='h-7 w-28 md:h-8 md:w-32' />
          <Skeleton className='h-4 w-12 rounded-full' />
        </div>

        {/* Top Row — Equity Hero + Portfolio Breakdown */}
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
          <div className='lg:col-span-2'>
            <Skeleton className='h-36 w-full rounded-xl md:h-40' />
          </div>
          <Skeleton className='h-36 w-full rounded-xl md:h-40' />
        </div>

        {/* Second Row — Margin Overview + Daily PnL */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <Skeleton className='h-44 w-full rounded-xl' />
          <Skeleton className='h-44 w-full rounded-xl' />
        </div>

        {/* Third Row — Price Feed Health */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          <Skeleton className='h-24 w-full rounded-xl' />
        </div>

        {/* Bottom Row — Open Positions + Recent Trades */}
        <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
          <Skeleton className='h-64 w-full rounded-xl' />
          <Skeleton className='h-64 w-full rounded-xl' />
        </div>
      </div>
    </div>
  );
}
