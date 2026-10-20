import { useCallback, useEffect, useState } from 'react'
import { ColumnShell, UserBubble } from '../components/ColumnShell'
import { useConversation } from '../lib/useConversation'
import type { StreamEvent } from '../lib/sse'
import { DILView, type DILTurnData } from '../dil/DILView'
import type { Submission } from '../App'

const EMPTY: DILTurnData = { code: '', constants: {}, diagnostics: [], fallback: '' }
const TABS = ['Raw DIL', 'Compiled JS', 'Constants', 'Diagnostics', 'Fallback'] as const

export function DILColumn({ submission }: { submission: Submission | null }) {
  const [compiled, setCompiled] = useState<Record<number, DILTurnData>>({})
  const [tab, setTab] = useState<(typeof TABS)[number]>('Raw DIL')
  const [recompiles, setRecompiles] = useState(0)

  const onEvent = useCallback((event: StreamEvent, turnId: number) => {
    if (event.type !== 'dil') return
    setCompiled((prev) => {
      const cur = prev[turnId] ?? EMPTY
      const patch = (event.constants_patch ?? {}) as Record<string, string>
      return {
        ...prev,
        [turnId]: {
          code: typeof event.code === 'string' ? event.code : cur.code,
          constants: Object.keys(patch).length ? { ...cur.constants, ...patch } : cur.constants,
          diagnostics: (event.diagnostics ?? []) as Record<string, unknown>[],
          fallback: (event.fallback_markdown as string) ?? cur.fallback,
        },
      }
    })
    if (typeof event.code === 'string') setRecompiles((n) => n + 1)
  }, [])

  const convo = useConversation('/api/dil/stream', onEvent)
  const { send, markFirstUI, turns } = convo

  useEffect(() => {
    if (submission) {
      setRecompiles(0)
      void send(submission.text)
    }
  }, [submission, send])

  const lastAssistant = turns.filter((t) => t.role === 'assistant').at(-1)
  const last = lastAssistant ? compiled[lastAssistant.id] ?? EMPTY : EMPTY

  const debugBody = () => {
    switch (tab) {
      case 'Raw DIL':
        return lastAssistant?.content ?? ''
      case 'Compiled JS':
        return last.code
      case 'Constants':
        return JSON.stringify(last.constants, null, 2)
      case 'Diagnostics':
        return last.diagnostics.length ? JSON.stringify(last.diagnostics, null, 2) : 'No diagnostics'
      case 'Fallback':
        return last.fallback
    }
  }

  return (
    <ColumnShell
      title="Disdjj / ChatGPT DIL"
      subtitle="Markdown + JSX + JS, compiled server-side, run in a sandboxed worker"
      {...convo}
      footer={
        <details className="debug">
          <summary>
            Debug: {recompiles} program recompiles, {last.diagnostics.length} diagnostics
          </summary>
          <div className="debug-tabs">
            {TABS.map((t) => (
              <button key={t} type="button" className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
          <pre>{debugBody()}</pre>
        </details>
      }
    >
      {turns.map((t) =>
        t.role === 'user' ? (
          <UserBubble key={t.id} text={t.content} />
        ) : (
          <DILView key={t.id} data={compiled[t.id] ?? EMPTY} onIssueTurn={(text) => void send(text)} onFirstTree={markFirstUI} />
        ),
      )}
    </ColumnShell>
  )
}
