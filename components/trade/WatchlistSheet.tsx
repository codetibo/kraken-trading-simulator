'use client';

import { memo } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Watchlist } from './Watchlist';
import { Menu } from 'lucide-react';

export const WatchlistSheet = memo(function WatchlistSheet() {
  return (
    <Sheet>
      <SheetTrigger className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
        <Menu className="h-4 w-4" />
        <span className="sr-only">Open watchlist</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
        <SheetHeader className="sr-only">
          <SheetTitle>Watchlist</SheetTitle>
        </SheetHeader>
        <Watchlist />
      </SheetContent>
    </Sheet>
  );
});
