import type { Metadata } from 'next';
import { AssetProvider } from '@/components/trade/AssetProvider';
import { ResizableLayout } from './ResizableLayout';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Trade — Terminal',
  description: 'Spot & Margin trading interface',
};

export default async function TradePage() {
  return (
    <AssetProvider>
      <ResizableLayout />
    </AssetProvider>
  );
}
