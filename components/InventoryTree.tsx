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
  _regionColor?: string
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
  const [dims, setDims] = useState({ width: 800, height: 600 })

  useEffect(() => {
    if (containerRef.current) {
      setDims({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight })
    }
  }, [])

  const treeData = useMemo<RawNodeDatum>(() => ({
    name: 'Collection',
    attributes: { total: items.length },
    children: REGION_ORDER.map(region => {
      const color = REGION_COLORS[region]
      const culturesInRegion = CULTURES.filter(c => c.region === region)
      return {
        name: region,
        _region: region,
        _regionColor: color,
        children: culturesInRegion.map(c => {
          const pieces = piecesForCulture(items, c.culture)
          return {
            name: c.culture,
            _regionColor: color,
            attributes: { count: pieces.length },
            children: pieces.map(p => ({
              name: p.name,
              _regionColor: color,
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
    const regionColor = nodeDatum._regionColor ?? '#888'

    const W = 160
    const H = 44
    const x = -(W / 2)
    const y = -(H / 2)

    if (isRoot) {
      return (
        <g onClick={toggleNode} style={{ cursor: 'pointer' }}>
          <rect x={x} y={y} width={W} height={H} rx={10} fill="#18181b" />
          <text x={0} textAnchor="middle" dy="-4" fontSize={12} fontWeight={600} fill="white" style={{ userSelect: 'none' }}>
            Collection
          </text>
          <text x={0} textAnchor="middle" dy="11" fontSize={10} fill="#71717a" style={{ userSelect: 'none' }}>
            {items.length} pieces
          </text>
        </g>
      )
    }

    if (isRegion) {
      return (
        <g onClick={toggleNode} style={{ cursor: 'pointer' }}>
          <rect x={x} y={y} width={W} height={H} rx={10} fill={regionColor} />
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
        <g onClick={toggleNode} style={{ cursor: 'pointer', opacity: isEmpty ? 0.4 : 1 }}>
          <rect x={x} y={y} width={W} height={H} rx={9} fill="white" stroke="#e4e4e7" strokeWidth={1.5} />
          <rect x={x} y={y} width={4} height={H} rx={2} fill={regionColor} />
          <text x={6 - W / 2} textAnchor="start" dy="-3" fontSize={10} fontWeight={500} fill="#111827" style={{ userSelect: 'none' }}>
            {nodeDatum.name.length > 17 ? nodeDatum.name.slice(0, 17) + '…' : nodeDatum.name}
          </text>
          <text x={6 - W / 2} textAnchor="start" dy="12" fontSize={9} fill="#9ca3af" style={{ userSelect: 'none' }}>
            {count} {count === 1 ? 'piece' : 'pieces'}
          </text>
        </g>
      )
    }

    if (isPiece) {
      const PW = 150
      const PH = 40
      return (
        <g style={{ cursor: 'pointer' }} onClick={() => onEditPiece(nodeDatum._item!)}>
          <rect x={-(PW / 2)} y={-(PH / 2)} width={PW} height={PH} rx={8} fill="#fafafa" stroke="#e4e4e7" strokeWidth={1} />
          <text x={0} textAnchor="middle" dy="-4" fontSize={9.5} fontWeight={500} fill="#111827" style={{ userSelect: 'none' }}>
            {nodeDatum.name.length > 20 ? nodeDatum.name.slice(0, 20) + '…' : nodeDatum.name}
          </text>
          {nodeDatum.attributes?.age && (
            <text x={0} textAnchor="middle" dy="10" fontSize={8.5} fill="#9ca3af" style={{ userSelect: 'none' }}>
              {String(nodeDatum.attributes.age).slice(0, 24)}
            </text>
          )}
        </g>
      )
    }

    return null
  }

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden border border-[#e4e4e7]"
      style={{ height: 'calc(100vh - 260px)', minHeight: 400, background: '#f8f8f9' }}
    >
      <Tree
        data={treeData}
        orientation="vertical"
        pathFunc="step"
        translate={{ x: dims.width / 2, y: 60 }}
        zoom={0.6}
        initialDepth={1}
        separation={{ siblings: 1.1, nonSiblings: 1.4 }}
        nodeSize={{ x: 190, y: 110 }}
        renderCustomNodeElement={renderNode as RenderCustomNodeElementFn}
        pathClassFunc={() => 'tree-link'}
      />
      <style>{`.tree-link { stroke: #d4d4d8; stroke-width: 1.5px; fill: none; } .rd3t-link { stroke: #d4d4d8 !important; stroke-width: 1.5px !important; }`}</style>
    </div>
  )
}
