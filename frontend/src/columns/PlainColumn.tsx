import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ColumnShell, UserBubble } from '../components/ColumnShell'
import { useConversation } from '../lib/useConversation'
import type { Submission } from '../App'

export function PlainColumn({ submission }: { submission: Submission | null }) {
  const convo = useConversation('/api/plain/stream')
  const { send } = convo

  useEffect(() => {
    if (submission) void send(submission.text)
  }, [submission, send])

  return (
    <ColumnShell title="Normal response" subtitle="Claude, Markdown only" {...convo}>
      {convo.turns.map((t) =>
        t.role === 'user' ? (
          <UserBubble key={t.id} text={t.content} />
        ) : (
          <div key={t.id} className="markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.content}</ReactMarkdown>
          </div>
        ),
      )}
    </ColumnShell>
  )
}
