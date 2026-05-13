'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import Tree from 'react-d3-tree'
import type { RenderCustomNodeElementFn } from 'react-d3-tree'
import { CULTURES, REGION_COLORS } from '@/lib/constants'
import type { PotteryItem } from '@/lib/types'
import type { Region } from '@/lib/constants'

interface Props {
  items: PotteryItem[]
  onEditPiece: (item: PotteryItem) => void
}

interface RawNodeDatum {
  name: string
  attributes?: Record<string, string | number>
  children?: RawNodeDatum[]
  _item?: PotteryItem
  _region?: Region
}

function piecesForCulture(items: PotteryItem[], cultureName: string): PotteryItem[] {
  const needle = cultureName.toLowerCase()
  return items.filter(item => {
    if (!item.tribe_culture) return false
    const hay = item.tribe_culture.toLowerCase()
    return hay.includes(needle) || needle.includes(hay)
  })
}

const REGION_ORDER: Region[] = ['North America', 'Mesoamerica', 'South America', 'Caribbean / Amazonia']

export default function InventoryTree({ items, onEditPiece }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(600)

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight)
    }
  }, [])

  const treeData = useMemo<RawNodeDatum>(() => ({
    name: 'Collection',
    attributes: { total: items.length },
    children: REGION_ORDER.map(region => {
      const culturesInRegion = CULTURES.filter(c => c.region === region)
      return {
        name: region,
        _region: region,
        children: culturesInRegion.map(c => {
          const pieces = piecesForCulture(items, c.culture)
          return {
            name: c.culture,
            attributes: { count: pieces.length },
            children: pieces.map(p => ({
              name: p.name,
              attributes: { sku: p.sku, age: p.age ?? '' },
              _item: p,
            })),
          }
        }),
      }
    }),
  }), [items])

  function renderNode({ nodeDatum, toggleNode }: { nodeDatum: RawNodeDatum; toggleNode: () => void }) {
    const isRoot = nodeDatum.name === 'Collection'
    const isRegion = !!nodeDatum._region
    const isPiece = !!nodeDatum._item
    const isCulture = !isRoot && !isRegion && !isPiece

    if (isPiece) {
      return (
        <g>
          <rect x={-70} y={-20} width={140} height={40} rx={6} fill="white" stroke="#e5e5e5" strokeWidth={1} style={{ cursor: 'pointer' }} onClick={() => onEditPiece(nodeDatum._item!)} />
          <text x={0} textAnchor="middle" dy="-4" fontSize={10} fontWeight={500} fill="#111" style={{ pointerEvents: 'none', userSelect: 'none' }}>
            {nodeDatum.name.length > 20 ? nodeDatum.name.slice(0, 20) + '…' : nodeDatum.name}
          </text>
          {nodeDatum.attributes?.age && (
            <text x={0} textAnchor="middle" dy="10" fontSize={9} fill="#aaa" style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {String(nodeDatum.attributes.age).slice(0, 22)}
            </text>
          )}
        </g>
      )
    }

    if (isRoot) {
      return (
        <g onClick={toggleNode} style={{ cursor: 'pointer' }}>
          <rect x={-80} y={-22} width={160} height={44} rx={8} fill="#111" />
          <text x={0} textAnchor="middle" dy="-4" fontSize={12} fontWeight={600} fill="white" style={{ userSelect: 'none' }}>Collection</text>
          <text x={0} textAnchor="middle" dy="11" fontSize={10} fill="#aaa" style={{ userSelect: 'none' }}>{items.length} pieces</text>
        </g>
      )
    }

    if (isRegion) {
      const color = REGION_COLORS[nodeDatum._region!]
      return (
        <g onClick={toggleNode} style={{ cursor: 'pointer' }}>
          <rect x={-80} y={-20} width={160} height={40} rx={7} fill={color} />
          <text x={0} textAnchor="middle" dy="5" fontSize={11} fontWeight={600} fill="white" style={{ userSelect: 'none' }}>
            {nodeDatum.name}
          </text>
        </g>
      )
    }

    if (isCulture) {
      const count = Number(nodeDatum.attributes?.count ?? 0)
      const isEmpty = count === 0
      return (
        <g onClick={toggleNode} style={{ cursor: 'pointer', opacity: isEmpty ? 0.45 : 1 }}>
          <rect x={-72} y={-18} width={144} height={36} rx={6} fill={isEmpty ? '#f3f3f3' : 'white'} stroke="#e5e5e5" strokeWidth={1} />
          <text x={0} textAnchor="middle" dy="-3" fontSize={10} fontWeight={500} fill="#333" style={{ userSelect: 'none' }}>
            {nodeDatum.name.length > 18 ? nodeDatum.name.slice(0, 18) + '…' : nodeDatum.name}
          </text>
          <text x={0} textAnchor="middle" dy="11" fontSize={9} fill="#aaa" style={{ userSelect: 'none' }}>
            {count} {count === 1 ? 'piece' : 'pieces'}
          </text>
        </g>
      )
    }

    return null
  }

  return (
    <div
      ref={containerRef}
      className="w-full bg-[#fafafa] rounded-2xl border border-[#e5e5e5] overflow-hidden"
      style={{ height: 'calc(100vh - 260px)', minHeight: 400 }}
    >
      <Tree
        data={treeData}
        orientation="horizontal"
        pathFunc="step"
        translate={{ x: 120, y: containerHeight / 2 }}
        zoom={0.65}
        initialDepth={1}
        separation={{ siblings: 0.6, nonSiblings: 0.8 }}
        nodeSize={{ x: 220, y: 55 }}
        renderCustomNodeElement={renderNode as RenderCustomNodeElementFn}
        pathClassFunc={() => 'tree-path'}
      />
      <style>{`.tree-path { stroke: #d0d0d0; stroke-width: 1.5px; fill: none; } .rd3t-link { stroke: #d0d0d0 !important; }`}</style>
    </div>
  )
}
