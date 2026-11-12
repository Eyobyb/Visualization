import type { ReactNode } from 'react'
import type { GraphKind } from '../config'

/**
 * Line-art hint for a graph finding. Same role as the Signal Drawer brief glyph:
 * it names the chart shape without drawing the chart.
 */
export function FindingGlyph({ kind }: { kind: GraphKind }) {
  return (
    <span className="flex h-[34px] w-24 shrink-0 items-center justify-end text-nc-ink" aria-hidden>
      {GLYPHS[kind]}
    </span>
  )
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 96 34" className="h-[34px] w-24 overflow-visible" fill="none">
      {children}
    </svg>
  )
}

const quiet = { stroke: 'currentColor', strokeOpacity: 0.22, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const hot = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function EndDot({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r="5" fill="var(--color-nc-lime-glow)" />
      <circle cx={cx} cy={cy} r="2.4" fill="currentColor" />
    </>
  )
}

function Bars({ heights, baseline }: { heights: number[]; baseline?: number }) {
  const w = 6
  const gap = 4
  const total = heights.length * w + (heights.length - 1) * gap
  const x0 = 96 - total
  return (
    <Svg>
      {baseline != null ? <line x1={x0} x2="94" y1={baseline} y2={baseline} stroke="currentColor" strokeOpacity="0.45" strokeDasharray="2 2" /> : null}
      {heights.map((h, i) => {
        const x = x0 + i * (w + gap)
        const y = 32 - h
        const last = i === heights.length - 1
        return <rect key={i} x={x} y={y} width={w} height={h} rx="1.5" fill="currentColor" fillOpacity={last ? 1 : 0.22} />
      })}
    </Svg>
  )
}

const GLYPHS: Record<GraphKind, ReactNode> = {
  trend: (
    <Svg>
      <path d="M4 26 C14 26 16 18 28 18 S40 22 48 14 62 8 74 10 86 6 92 5" {...quiet} />
      <path d="M4 26 C14 26 16 18 28 18 S40 22 48 14 62 8 74 10 86 6 92 5" {...hot} />
      <EndDot cx={92} cy={5} />
    </Svg>
  ),
  columns: <Bars heights={[12, 16, 14, 20, 15, 22, 28]} />,
  columns_baseline: <Bars heights={[14, 18, 12, 22, 16, 26, 20]} baseline={16} />,
  stacked_bars: (
    <Svg>
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 40 + i * 11
        const bottom = 7 + (i % 3) * 2
        const top = 8 + (i % 2) * 4
        const yBottom = 32 - bottom
        const yTop = yBottom - 2 - top
        const emphasis = i === 4
        return (
          <g key={i}>
            <rect x={x} y={yBottom} width="7" height={bottom} rx="1" fill="currentColor" fillOpacity={emphasis ? 0.35 : 0.18} />
            <rect x={x} y={yTop} width="7" height={top} rx="1" fill="currentColor" fillOpacity={emphasis ? 1 : 0.42} />
          </g>
        )
      })}
    </Svg>
  ),
  funnel: (
    <Svg>
      {[88, 64, 44, 26].map((w, i) => (
        <rect key={w} x={(96 - w) / 2} y={3 + i * 8} width={w} height="5" rx="2.5" fill="currentColor" fillOpacity={i === 3 ? 1 : 0.22} />
      ))}
    </Svg>
  ),
  pie: (
    <Svg>
      <circle cx="72" cy="17" r="12" stroke="currentColor" strokeOpacity="0.22" strokeWidth="5" />
      <path d="M72 5 A12 12 0 0 1 83.2 22.5" stroke="currentColor" strokeWidth="5" strokeLinecap="butt" />
    </Svg>
  ),
  scatter: (
    <Svg>
      {[
        [40, 22],
        [50, 16],
        [58, 24],
        [66, 12],
        [74, 18],
        [84, 8],
      ].map(([cx, cy], i, all) => (
        <circle key={cx} cx={cx} cy={cy} r={i === all.length - 1 ? 3 : 2.2} fill="currentColor" fillOpacity={i === all.length - 1 ? 1 : 0.28} />
      ))}
    </Svg>
  ),
  radar: (
    <Svg>
      <polygon points="72,6 84,14 80,27 64,27 60,14" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.2" />
      <polygon points="72,11 79,16 76,23 68,22 66,16" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.4" />
    </Svg>
  ),
  gauge: (
    <Svg>
      <path d="M52 26 A16 16 0 1 1 88 26" {...quiet} strokeWidth="4" />
      <path d="M52 26 A16 16 0 0 1 80 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="80" cy="12" r="2.4" fill="currentColor" />
    </Svg>
  ),
  heatmap: (
    <Svg>
      {Array.from({ length: 12 }, (_, n) => {
        const col = n % 4
        const row = Math.floor(n / 4)
        const hotCell = n === 6
        return (
          <rect
            key={n}
            x={48 + col * 12}
            y={2 + row * 10}
            width="9"
            height="8"
            rx="1.5"
            fill="currentColor"
            fillOpacity={hotCell ? 1 : 0.12 + ((n * 3) % 5) * 0.06}
          />
        )
      })}
    </Svg>
  ),
  sankey: (
    <Svg>
      <path d="M36 8 C54 8 58 8 78 10" {...quiet} />
      <path d="M36 8 C54 8 58 14 78 22" {...hot} />
      <path d="M36 26 C54 26 60 24 78 22" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.6" />
      <circle cx="36" cy="8" r="2" fill="currentColor" fillOpacity="0.35" />
      <circle cx="36" cy="26" r="2" fill="currentColor" fillOpacity="0.35" />
      <circle cx="78" cy="22" r="2.4" fill="currentColor" />
    </Svg>
  ),
  treemap: (
    <Svg>
      <rect x="48" y="3" width="22" height="28" rx="2" fill="currentColor" fillOpacity="0.16" />
      <rect x="72" y="3" width="20" height="16" rx="2" fill="currentColor" />
      <rect x="72" y="21" width="20" height="10" rx="2" fill="currentColor" fillOpacity="0.35" />
    </Svg>
  ),
}
