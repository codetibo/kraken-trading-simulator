import { listOpenPositions } from '@/server/actions/positions';
import { PositionsPageClient } from './PositionsPageClient';

export const dynamic = 'force-dynamic';

export default async function PositionsPage() {
  const positions = await listOpenPositions();
  return <PositionsPageClient initialPositions={positions} />;
}
