import { useRef, useState, type FormEvent } from 'react'
import { LayoutGrid } from 'lucide-react'
import { PlainColumn } from './columns/PlainColumn'
import { OpenUIColumn } from './columns/OpenUIColumn'
import { DILColumn } from './columns/DILColumn'
import { searchFor, type SearchPayload } from './lib/search'
import './App.css'

/** `search` is null when the context itself is the result (no DuckDuckGo call). */
export type Submission = { id: number; text: string; search: SearchPayload | null; context: string }

const MAX_CONTEXT_CHARS = 100_000
const DEFAULT_CONTEXT_PROMPT = 'Use the attached context as the data and present it in the most useful way.'

const SAMPLES = [
  'best laptops for developers 2026',
  'weather in Addis Ababa',
  'how does a bike drivetrain work',
  'FastAPI vs Django for a new API',
]

export default function App() {
  const [text, setText] = useState('')
  const [context, setContext] = useState('')
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [searching, setSearching] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const latest = useRef(0)

  const submit = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const id = Date.now()
    latest.current = id
    setText('')
    setSearching(trimmed)
    setSearchError(null)
    try {
      const search = await searchFor(trimmed)
      if (latest.current === id) setSubmission({ id, text: trimmed, search, context: context.trim() })
    } catch (e) {
      if (latest.current === id) setSearchError(String(e))
    } finally {
      if (latest.current === id) setSearching(null)
    }
  }

  const sendContextAsResult = () => {
    const ctx = context.trim()
    if (!ctx) return
    latest.current = Date.now()
    setSearching(null)
    setSearchError(null)
    setSubmission({ id: latest.current, text: text.trim() || DEFAULT_CONTEXT_PROMPT, search: null, context: ctx })
    setText('')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void submit(text)
  }

  return (
    <div className="app">
      <header className="app-bar">
        <a className="catalog-link" href="/catalog.html">
          <LayoutGrid size={14} aria-hidden />
          Component catalog
        </a>
      </header>
      <details className="context-section" open>
        <summary>
          Context
          <span className="context-meta">
            {context.trim()
              ? `${context.length.toLocaleString()} chars, sent with every message to all three columns`
              : 'Optional: paste any text to send alongside the search results'}
          </span>
        </summary>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          maxLength={MAX_CONTEXT_CHARS}
          placeholder="Paste notes, a document, CSV, JSON, an email thread..."
          rows={4}
        />
        <div className="context-actions">
          <button
            type="button"
            className="primary"
            disabled={!context.trim() || searching !== null}
            onClick={sendContextAsResult}
            title="Skip DuckDuckGo and send this text to all three columns as the result. The prompt box, if filled, becomes the question."
          >
            Use context as the result
          </button>
          {context && (
            <button type="button" onClick={() => setContext('')}>
              Clear context
            </button>
          )}
        </div>
      </details>
      <form className="prompt-bar" onSubmit={onSubmit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search DuckDuckGo once, compare three ways of answering..."
          autoFocus
        />
        <button type="submit" disabled={!text.trim() || searching !== null}>
          Search and send
        </button>
        <div className="samples">
          {SAMPLES.map((s) => (
            <button type="button" key={s} disabled={searching !== null} onClick={() => void submit(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="search-status">
          {searching !== null
            ? `Searching DuckDuckGo for “${searching}”…`
            : searchError
              ? searchError
              : submission && !submission.search
                ? 'Sent the context as the result (no DuckDuckGo search)'
                : submission?.search
                ? `${submission.search.results.length} results in ${(submission.search.elapsed_ms / 1000).toFixed(2)}s${submission.search.cached ? ' (cached)' : ''}${submission.search.error ? ` · ${submission.search.error}` : ''}`
                : ''}
        </div>
      </form>
      <main className="columns">
        <PlainColumn submission={submission} />
        <OpenUIColumn submission={submission} />
        <DILColumn submission={submission} />
      </main>
    </div>
  )
}
