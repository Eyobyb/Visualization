import { useCallback, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamSSE, type StreamEvent } from '../../lib/sse'
import { Card, type CardPayload } from '../index'

const SUGGESTIONS = [
  'How did trial activation change this month?',
  'Which ad channels have the best ROAS?',
  'Summarize support ticket volume by weekday',
]

/**
 * Live teaser flow: ask → (optional agent) full answer → brief card.
 * "Ask about this" reveals the full response for now.
 */
export function AskDemo() {
  const [question, setQuestion] = useState(SUGGESTIONS[0])
  const [agent, setAgent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [card, setCard] = useState<CardPayload | null>(null)
  const [answer, setAnswer] = useState('')
  const [openFull, setOpenFull] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const reset = () => {
    setError(null)
    setCard(null)
    setAnswer('')
    setOpenFull(false)
    setStatus('')
  }

  const run = useCallback(async () => {
    const q = question.trim()
    if (!q || busy) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    reset()
    setBusy(true)
    setStatus(agent ? 'Gathering data…' : 'Answering…')
    let draft = ''
    try {
      await streamSSE(
        '/api/card/stream',
        { messages: [{ role: 'user', content: q }], agent },
        (ev: StreamEvent) => {
          if (ev.type === 'agent_step') {
            const detail = ev.query || ev.url || ev.tool
            setStatus(`Agent: ${ev.tool}${detail && detail !== ev.tool ? ` · ${detail}` : ''}`)
          } else if (ev.type === 'agent') {
            setStatus(ev.fallback ? 'Answering without agent datasets…' : 'Writing answer…')
          } else if (ev.type === 'delta') {
            draft += ev.text
            setAnswer(draft)
            setStatus('Writing answer…')
          } else if (ev.type === 'card') {
            setCard(ev.payload as CardPayload)
            setStatus('Card ready')
          } else if (ev.type === 'done') {
            if (ev.answer) setAnswer(ev.answer)
            if (ev.card) setCard(ev.card as CardPayload)
            setStatus('')
          } else if (ev.type === 'error') {
            setError(ev.message)
            setStatus('')
          }
        },
        ac.signal,
      )
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message || 'Request failed')
      }
      setStatus('')
    } finally {
      setBusy(false)
    }
  }, [question, agent, busy])

  return (
    <section className="mb-10 rounded-[calc(var(--nc-card-radius)+0.25rem)] bg-nc-tile/60 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="m-0 font-nc-display text-xl font-normal tracking-[-0.02em] text-nc-ink">Ask → brief card</h2>
          <p className="mt-1 mb-0 max-w-[56ch] text-[0.78125rem] text-nc-ink-3">
            Full answer runs first (optional data agent). Then a teaser card is generated. Click Ask about this to open the full response.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-[0.75rem] text-nc-ink-2">
          <input type="checkbox" checked={agent} onChange={(e) => setAgent(e.target.checked)} disabled={busy} />
          Data agent
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          className="min-w-0 flex-1 rounded-full border-0 bg-nc-surface px-4 text-[0.875rem] text-nc-ink outline-none ring-1 ring-nc-line-2 focus:ring-nc-ink/25"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run()
          }}
          placeholder="Ask a question…"
          disabled={busy}
        />
        <button
          type="button"
          className="h-10 shrink-0 rounded-full border-0 bg-nc-ink px-5 font-nc-ui text-[0.8125rem] font-medium text-nc-stage disabled:opacity-50"
          onClick={() => void run()}
          disabled={busy || !question.trim()}
        >
          {busy ? 'Working…' : 'Ask'}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-full border-0 bg-nc-surface px-2.5 py-1 text-[0.71875rem] text-nc-ink-2 hover:text-nc-ink"
            disabled={busy}
            onClick={() => setQuestion(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {status ? <p className="mt-3 mb-0 font-nc-mono text-[0.6875rem] text-nc-ink-3">{status}</p> : null}
      {error ? <p className="mt-3 mb-0 text-[0.8125rem] text-red-600">{error}</p> : null}

      {card ? (
        <div className="mt-4 max-w-[35rem]">
          <Card
            payload={card}
            state={busy ? 'updating' : 'ready'}
            onAsk={() => setOpenFull(true)}
          />
        </div>
      ) : null}

      {openFull && answer ? (
        <div className="mt-4 rounded-[var(--nc-card-radius)] bg-nc-surface p-4 ring-1 ring-nc-line-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="m-0 font-nc-display text-lg font-normal text-nc-ink">Full response</h3>
            <button
              type="button"
              className="rounded-full border-0 bg-nc-tile px-3 py-1 text-[0.75rem] text-nc-ink-2 hover:text-nc-ink"
              onClick={() => setOpenFull(false)}
            >
              Close
            </button>
          </div>
          <div className="prose prose-sm max-w-none text-nc-ink-2 [&_h1]:text-nc-ink [&_h2]:text-nc-ink [&_h3]:text-nc-ink [&_strong]:text-nc-ink">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
          </div>
        </div>
      ) : null}

      {!openFull && answer && !card && busy ? (
        <p className="mt-3 mb-0 text-[0.78125rem] text-nc-ink-3">Answer streaming… card comes next.</p>
      ) : null}
    </section>
  )
}
