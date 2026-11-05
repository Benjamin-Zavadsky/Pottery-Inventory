import { Suspense } from 'react';
import Catalog from './_components/Catalog';
import { CardGridSkeleton } from '@/components/ui/Skeleton';

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <CardGridSkeleton />
        </div>
      }
    >
      <Catalog />
    </Suspense>
  );
}
