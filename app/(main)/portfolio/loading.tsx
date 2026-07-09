import { Skeleton } from '@/components/ui/skeleton';

export default function PortfolioLoading() {
  return (
    <div className='h-full overflow-y-auto p-4 pb-8 md:p-6'>
      <div className='mx-auto max-w-7xl space-y-4 md:space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <Skeleton className='h-7 w-28 md:h-8 md:w-32' />
          <Skeleton className='h-4 w-12 rounded-full' />
        </div>

        {/* Top Row — Total Equity Hero + Quick Stats */}
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-4'>
          <Skeleton className='h-36 w-full rounded-xl lg:col-span-2' />
          <Skeleton className='h-36 w-full rounded-xl' />
          <Skeleton className='h-36 w-full rounded-xl' />
        </div>

        {/* Equity Chart */}
        <Skeleton className='h-72 w-full rounded-xl' />

        {/* Portfolio Analytics */}
        <div className='space-y-4'>
          <Skeleton className='h-5 w-44' />
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className='h-20 w-full rounded-lg' />
            ))}
          </div>
        </div>

        {/* Bottom Row — Holdings + Margin Positions */}
        <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
          <Skeleton className='h-72 w-full rounded-xl' />
          <Skeleton className='h-72 w-full rounded-xl' />
        </div>

        {/* Portfolio Breakdown Section */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <Skeleton className='h-48 w-full rounded-xl' />
          <Skeleton className='h-48 w-full rounded-xl' />
          <Skeleton className='h-48 w-full rounded-xl' />
        </div>
      </div>
    </div>
  );
}
