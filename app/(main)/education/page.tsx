import { getTutorialProgress } from '@/server/actions/tutorial';
import { EducationPageClient } from './EducationPageClient';

export const dynamic = 'force-dynamic';

export default async function EducationPage() {
  const progress = await getTutorialProgress();
  return <EducationPageClient initialProgress={progress} />;
}
