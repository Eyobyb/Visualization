import { useCallback, useRef, useState } from 'react'
import { searchFor, type SearchPayload } from './search'
import { streamSSE, type ChatMessage, type StreamEvent } from './sse'

export type Turn = ChatMessage & { id: number }

export type Metrics = { ttft?: number; ttfu?: number; total?: number }

let nextId = 1

/**
 * One independent conversation per column. `onEvent` lets a column react to
 * column-specific events (the DIL column consumes compiled patches).
 */
export function useConversation(endpoint: string, onEvent?: (event: StreamEvent, turnId: number) => void) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [streaming, setStreaming] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<Metrics>({})
  const startRef = useRef(0)
  const turnsRef = useRef<Turn[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const update = (next: Turn[]) => {
    turnsRef.current = next
    setTurns(next)
  }

  const markFirstUI = useCallback(() => {
    setMetrics((m) => (m.ttfu === undefined ? { ...m, ttfu: performance.now() - startRef.current } : m))
  }, [])

  const send = useCallback(
    async (text: string, search?: SearchPayload | null, context?: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const history: ChatMessage[] = turnsRef.current.map(({ role, content }) => ({ role, content }))
      const userTurn: Turn = { id: nextId++, role: 'user', content: text }
      const assistantTurn: Turn = { id: nextId++, role: 'assistant', content: '' }
      update([...turnsRef.current, userTurn, assistantTurn])
      setStreaming(true)
      setError(null)
      setMetrics({})
      startRef.current = performance.now()

      const appendText = (delta: string) => {
        update(turnsRef.current.map((t) => (t.id === assistantTurn.id ? { ...t, content: t.content + delta } : t)))
      }

      try {
        await streamSSE(
          endpoint,
          { messages: [...history, { role: 'user', content: text }], search: search ?? null, context: context || null },
          (event) => {
            if (event.type === 'delta') {
              setMetrics((m) => (m.ttft === undefined ? { ...m, ttft: performance.now() - startRef.current } : m))
              appendText(event.text)
            } else if (event.type === 'dil') {
              const raw = event.raw_append as string
              if (raw) {
                setMetrics((m) => (m.ttft === undefined ? { ...m, ttft: performance.now() - startRef.current } : m))
                appendText(raw)
              }
            } else if (event.type === 'error') {
              setError(event.message)
            }
            onEventRef.current?.(event, assistantTurn.id)
          },
          controller.signal,
        )
      } catch (e) {
        if (!controller.signal.aborted) setError(String(e))
      } finally {
        if (abortRef.current === controller) {
          setStreaming(false)
          setMetrics((m) => ({ ...m, total: performance.now() - startRef.current }))
        }
      }
    },
    [endpoint],
  )

  /** Follow-ups from inside a column search again, for that column only. */
  const searchAndSend = useCallback(
    async (text: string, context?: string) => {
      setSearching(true)
      setError(null)
      try {
        const search = await searchFor(text)
        await send(text, search, context)
      } catch (e) {
        setError(String(e))
      } finally {
        setSearching(false)
      }
    },
    [send],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    update([])
    setMetrics({})
    setError(null)
    setStreaming(false)
  }, [])

  return { turns, streaming, searching, error, metrics, send, searchAndSend, reset, markFirstUI }
}
