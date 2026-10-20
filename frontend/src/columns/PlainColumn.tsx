import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ColumnShell, UserBubble } from '../components/ColumnShell'
import type { Submission } from '../App'

/** Shows the DuckDuckGo Markdown exactly as the backend returned it; no model call. */
export function PlainColumn({ submission }: { submission: Submission | null }) {
  const [history, setHistory] = useState<Submission[]>([])

  useEffect(() => {
    if (submission) setHistory((h) => [...h, submission])
  }, [submission])

  const last = history.at(-1)

  return (
    <ColumnShell
      title="Raw search results (DuckDuckGo)"
      subtitle="Unedited Markdown, also sent to both generative columns"
      metrics={last?.search ? { ttft: last.search.elapsed_ms, total: last.search.elapsed_ms } : {}}
      streaming={false}
      error={last?.search?.error ?? null}
    >
      {history.map((s) => (
        <div key={s.id}>
          <UserBubble text={s.text} />
          {s.context && (
            <div className="raw-context">
              <div className="raw-search-meta">
                {s.search ? 'Context' : 'Context, used as the result (no search)'} (
                {s.context.length.toLocaleString()} chars)
              </div>
              <pre className="raw-context-text">{s.context}</pre>
            </div>
          )}
          {s.search && (
            <>
              <div className="raw-search-meta">
                {s.search.results.length} results in {(s.search.elapsed_ms / 1000).toFixed(2)}s
                {s.search.cached ? ' (cached)' : ''}
              </div>
              <div className="markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.search.markdown}</ReactMarkdown>
              </div>
            </>
          )}
        </div>
      ))}
    </ColumnShell>
  )
}
