export default function RootLoading() {
  return (
    <div className='flex h-full items-center justify-center'>
      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        <div className='h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent' />
        Loading...
      </div>
    </div>
  );
}
