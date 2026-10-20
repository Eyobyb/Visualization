import { useEffect, useRef, type ReactNode } from 'react'
import type { Metrics } from '../lib/useConversation'

function fmt(ms?: number) {
  return ms === undefined ? '–' : `${(ms / 1000).toFixed(2)}s`
}

export function ColumnShell(props: {
  title: string
  subtitle: string
  metrics: Metrics
  streaming: boolean
  error: string | null
  children: ReactNode
  footer?: ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el && props.streaming) el.scrollTop = el.scrollHeight
  })

  return (
    <section className="column">
      <header className="column-header">
        <div>
          <h2>{props.title}</h2>
          <p>{props.subtitle}</p>
        </div>
        <div className="metrics">
          <span title="Time to first token">TTFT {fmt(props.metrics.ttft)}</span>
          <span title="Time to first rendered UI">TTFU {fmt(props.metrics.ttfu)}</span>
          <span title="Total stream time">Total {fmt(props.metrics.total)}</span>
          {props.streaming && <span className="live">streaming</span>}
        </div>
      </header>
      <div className="column-body" ref={scrollRef}>
        {props.children}
        {props.error && <div className="error">{props.error}</div>}
      </div>
      {props.footer}
    </section>
  )
}

export function UserBubble({ text }: { text: string }) {
  return <div className="user-bubble">{text}</div>
}
