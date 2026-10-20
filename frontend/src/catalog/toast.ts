import { useEffect, useState } from 'react'

type Listener = (message: string) => void
const listeners = new Set<Listener>()

/** Shows a short message at the bottom of the catalog page. */
export function notify(message: string) {
  listeners.forEach((l) => l(message))
}

/** The message currently on screen, cleared after a few seconds. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const listener: Listener = (m) => {
      setMessage(m)
      clearTimeout(timer)
      timer = setTimeout(() => setMessage(null), 2600)
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
      clearTimeout(timer)
    }
  }, [])
  return message
}
