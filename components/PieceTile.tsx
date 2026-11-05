import Link from 'next/link';
import { PieceImage } from '@/components/ui/PieceImage';
import { coverThumb } from '@/lib/photos';
import type { PieceSummary } from '@/lib/types';

export default function PieceTile({ piece, accent }: { piece: PieceSummary; accent?: string }) {
  return (
    <Link href={`/item/${piece.sku}`} className="group flex w-[104px] shrink-0 flex-col">
      <div
        className="mb-2 h-[104px] w-[104px] overflow-hidden rounded-xl border border-line bg-sunken transition-colors group-hover:border-line-strong"
        style={accent ? { boxShadow: `inset 0 -3px 0 ${accent}` } : undefined}
      >
        <PieceImage
          src={coverThumb(piece)}
          fallbackSrc={piece.photos?.[0]}
          alt={piece.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <p className="line-clamp-2 text-[11px] font-medium leading-tight text-ink">{piece.name}</p>
      <p className="mt-0.5 font-mono text-[10px] text-faint">{piece.sku}</p>
    </Link>
  );
}

export function TileRow({
  pieces,
  accent,
}: {
  pieces: PieceSummary[];
  accent?: (p: PieceSummary) => string | undefined;
}) {
  return (
    <div className="overflow-x-auto pb-4 pl-9 pr-5 pt-2">
      <div className="flex gap-3" style={{ width: 'max-content' }}>
        {pieces.map((piece) => (
          <PieceTile key={piece.id} piece={piece} accent={accent?.(piece)} />
        ))}
      </div>
    </div>
  );
}
