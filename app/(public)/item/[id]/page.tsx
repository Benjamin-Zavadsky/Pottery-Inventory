import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import ItemView from './_components/ItemView';

type Props = { params: Promise<{ id: string }> };

// Server-side metadata gives shared links a real title, summary and cover
// image; the page body stays client-rendered like the rest of the catalog.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const isSku = /^P\d+$/i.test(id);
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await supabase
      .from('pottery')
      .select('name, sku, description, photos, thumbs')
      .eq(isSku ? 'sku' : 'id', isSku ? id.toUpperCase() : id)
      .maybeSingle();
    if (!data) return { title: 'Piece not found' };
    const title = `${data.name} (${data.sku})`;
    const description = data.description ? String(data.description).slice(0, 160) : undefined;
    const image = data.photos?.[0];
    return {
      title,
      description,
      openGraph: { title, description, images: image ? [image] : undefined },
    };
  } catch {
    return { title: 'Collection piece' };
  }
}

export default function ItemPage() {
  return <ItemView />;
}
