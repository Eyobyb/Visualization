import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Renderer, type ActionEvent, type OpenUIError } from '@openuidev/react-lang'
import { openuiChatLibrary } from '@openuidev/react-ui/genui-lib'
import { ThemeProvider } from '@openuidev/react-ui'
import '@openuidev/react-ui/layered/styles/index.css'
import { ColumnShell, UserBubble } from '../components/ColumnShell'
import { useConversation } from '../lib/useConversation'
import { searchFor } from '../lib/search'
import type { Submission } from '../App'

type ToolCall = { query: string; results: number; ms: number; cached?: boolean }

export function OpenUIColumn({ submission }: { submission: Submission | null }) {
  const convo = useConversation('/api/openui/stream')
  const { send, searchAndSend, markFirstUI, turns, streaming } = convo
  const [errors, setErrors] = useState<OpenUIError[]>([])
  const [showSource, setShowSource] = useState(false)
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([])

  const submissionRef = useRef(submission)
  submissionRef.current = submission

  useEffect(() => {
    if (submission) void send(submission.text, submission.search, submission.context)
  }, [submission, send])

  const lastAssistant = turns.filter((t) => t.role === 'assistant').at(-1)
  useEffect(() => {
    // The first statement is always `root = ...`; once it parses, the shell UI is on screen.
    if (lastAssistant && /\broot\s*=/.test(lastAssistant.content)) markFirstUI()
  }, [lastAssistant, markFirstUI])

  const toolProvider = useMemo(
    () => ({
      web_search: async (args: Record<string, unknown>) => {
        const query = typeof args.query === 'string' ? args.query.trim() : ''
        if (!query) return { results: [] }
        const started = performance.now()
        const payload = await searchFor(query)
        setToolCalls((c) => [
          ...c.slice(-19),
          { query, results: payload.results.length, ms: Math.round(performance.now() - started), cached: payload.cached },
        ])
        return { results: payload.results }
      },
    }),
    [],
  )

  const onAction = useCallback(
    (event: ActionEvent) => {
      if (event.type === 'continue_conversation') {
        const message = (event.params?.message as string | undefined) ?? event.humanFriendlyMessage
        const current = submissionRef.current
        if (!message) return
        if (current && !current.search) void send(message, null, current.context)
        else void searchAndSend(message, current?.context)
      } else if (event.type === 'open_url') {
        const url = event.params?.url as string | undefined
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
      }
    },
    [send, searchAndSend],
  )

  return (
    <ColumnShell
      title="Thesys / OpenUI"
      subtitle="OpenUI Lang, rendered by @openuidev/react-lang"
      {...convo}
      footer={
        <details className="debug" open={showSource} onToggle={(e) => setShowSource(e.currentTarget.open)}>
          <summary>
            Debug: OpenUI Lang source, {toolCalls.length} web_search calls
            {errors.length ? `, ${errors.length} parser issues` : ''}
          </summary>
          <pre>{lastAssistant?.content ?? ''}</pre>
          {toolCalls.length > 0 && <pre>{JSON.stringify(toolCalls, null, 2)}</pre>}
          {errors.length > 0 && <pre>{JSON.stringify(errors, null, 2)}</pre>}
        </details>
      }
    >
      <ThemeProvider mode="light">
        {turns.map((t, i) =>
          t.role === 'user' ? (
            <UserBubble key={t.id} text={t.content} />
          ) : (
            <div key={t.id} className="openui-turn">
              <Renderer
                response={t.content || null}
                library={openuiChatLibrary}
                isStreaming={streaming && i === turns.length - 1}
                toolProvider={toolProvider}
                onAction={onAction}
                onError={i === turns.length - 1 ? setErrors : undefined}
              />
            </div>
          ),
        )}
      </ThemeProvider>
    </ColumnShell>
  )
}
