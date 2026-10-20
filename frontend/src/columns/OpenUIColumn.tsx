import { useCallback, useEffect, useState } from 'react'
import { Renderer, type ActionEvent, type OpenUIError } from '@openuidev/react-lang'
import { openuiChatLibrary } from '@openuidev/react-ui/genui-lib'
import { ThemeProvider } from '@openuidev/react-ui'
import '@openuidev/react-ui/layered/styles/index.css'
import { ColumnShell, UserBubble } from '../components/ColumnShell'
import { useConversation } from '../lib/useConversation'
import type { Submission } from '../App'

export function OpenUIColumn({ submission }: { submission: Submission | null }) {
  const convo = useConversation('/api/openui/stream')
  const { send, markFirstUI, turns, streaming } = convo
  const [errors, setErrors] = useState<OpenUIError[]>([])
  const [showSource, setShowSource] = useState(false)

  useEffect(() => {
    if (submission) void send(submission.text)
  }, [submission, send])

  const lastAssistant = turns.filter((t) => t.role === 'assistant').at(-1)
  useEffect(() => {
    // The first statement is always `root = ...`; once it parses, the shell UI is on screen.
    if (lastAssistant && /\broot\s*=/.test(lastAssistant.content)) markFirstUI()
  }, [lastAssistant, markFirstUI])

  const onAction = useCallback(
    (event: ActionEvent) => {
      if (event.type === 'continue_conversation') {
        const message = (event.params?.message as string | undefined) ?? event.humanFriendlyMessage
        if (message) void send(message)
      } else if (event.type === 'open_url') {
        const url = event.params?.url as string | undefined
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
      }
    },
    [send],
  )

  return (
    <ColumnShell
      title="Thesys / OpenUI"
      subtitle="OpenUI Lang, rendered by @openuidev/react-lang"
      {...convo}
      footer={
        <details className="debug" open={showSource} onToggle={(e) => setShowSource(e.currentTarget.open)}>
          <summary>Debug: OpenUI Lang source{errors.length ? ` (${errors.length} parser issues)` : ''}</summary>
          <pre>{lastAssistant?.content ?? ''}</pre>
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
