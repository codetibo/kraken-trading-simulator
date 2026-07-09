import { Skeleton } from '@/components/ui/skeleton';

export default function EducationLoading() {
  return (
    <div className='flex h-full flex-col overflow-y-auto p-4 pb-8 md:p-6'>
      <div className='mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-4 md:space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <Skeleton className='h-7 w-28 md:h-8 md:w-32' />
        </div>

        {/* Tabs */}
        <div className='flex gap-6 border-b border-border'>
          <Skeleton className='mb-[-1px] h-8 w-28 rounded-none' />
          <Skeleton className='mb-[-1px] h-8 w-40 rounded-none' />
        </div>

        {/* Description */}
        <Skeleton className='h-4 w-96' />

        {/* Card Grid */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-48 w-full rounded-xl' />
          ))}
        </div>
      </div>
    </div>
  );
}
