'use client';

import { memo } from 'react';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { OrderEntry } from './OrderEntry';
import { ArrowUpFromLine } from 'lucide-react';

export const MobileOrderDrawer = memo(function MobileOrderDrawer() {
  return (
    <Drawer snapPoints={[0.9, 0.5]}>
      <DrawerTrigger className="fixed bottom-4 left-1/2 z-40 flex h-10 -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 text-xs font-medium text-primary-foreground shadow-lg transition-colors hover:bg-primary/90">
        <ArrowUpFromLine className="h-3.5 w-3.5" />
        Trade
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="sr-only">
          <DrawerTitle>Order Entry</DrawerTitle>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <OrderEntry />
        </div>
      </DrawerContent>
    </Drawer>
  );
});
