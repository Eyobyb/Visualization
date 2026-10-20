import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sandbox, type DILNode, type SandboxMessage } from './sandbox'
import { HostRenderer } from './HostRenderer'

export type DILTurnData = {
  code: string
  constants: Record<string, string>
  diagnostics: Record<string, unknown>[]
  fallback: string
}

export function DILView(props: {
  data: DILTurnData
  onIssueTurn: (text: string) => void
  onFirstTree?: () => void
}) {
  const { data } = props
  const sandboxRef = useRef<Sandbox | null>(null)
  const versionRef = useRef(0)
  const sentCodeRef = useRef<string | null>(null)
  const callbacks = useRef(props)
  callbacks.current = props
  const [tree, setTree] = useState<DILNode[]>([])
  const [runtimeError, setRuntimeError] = useState<string | null>(null)

  useEffect(() => {
    const sandbox = new Sandbox((msg: SandboxMessage) => {
      if (msg.kind === 'tree') {
        setTree(msg.tree)
        setRuntimeError(null)
        if (msg.tree.length) callbacks.current.onFirstTree?.()
      } else if (msg.kind === 'error') {
        setRuntimeError(`${msg.phase}: ${msg.message}`)
      } else if (msg.kind === 'action') {
        if (msg.name === 'issueNewTurn') callbacks.current.onIssueTurn(msg.arg)
        else if (msg.name === 'copy') void navigator.clipboard?.writeText(msg.arg)
      }
    })
    sandboxRef.current = sandbox
    sentCodeRef.current = null
    return () => {
      sandbox.dispose()
      sandboxRef.current = null
    }
  }, [])

  useEffect(() => {
    const sandbox = sandboxRef.current
    if (!sandbox || !data.code) return
    if (data.code !== sentCodeRef.current) {
      sentCodeRef.current = data.code
      sandbox.send({ kind: 'setProgram', code: data.code, constants: data.constants, version: ++versionRef.current })
    } else {
      sandbox.send({ kind: 'setConstants', constants: data.constants })
    }
  }, [data.code, data.constants])

  const invoke = useCallback((fnId: string, args: unknown[]) => {
    sandboxRef.current?.send({ kind: 'invoke', fnId, args })
  }, [])

  return (
    <div className="dil-turn">
      {tree.length === 0 && runtimeError && data.fallback ? (
        <div className="markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.fallback}</ReactMarkdown>
        </div>
      ) : (
        <HostRenderer tree={tree} invoke={invoke} />
      )}
      {runtimeError && <div className="dil-status">Sandbox kept the last working program. {runtimeError}</div>}
    </div>
  )
}
