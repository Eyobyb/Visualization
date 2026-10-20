import workerSource from './worker.js?raw'
import frameSource from './frame.js?raw'

export type DILNode = string | { t: string; p: Record<string, unknown>; c: DILNode[] }

export type SandboxMessage =
  | { kind: 'ready' }
  | { kind: 'tree'; tree: DILNode[]; version: number; state: Record<string, unknown> }
  | { kind: 'error'; phase: string; message: string; version?: number }
  | { kind: 'action'; name: 'issueNewTurn' | 'copy'; arg: string }
  | { kind: 'idle' }
  | { kind: 'pong' }

const CSP = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:"

function buildSrcdoc() {
  // Escape "</script" so the injected sources cannot terminate the inline script element.
  const inject = (s: string) => s.replace(/<\/script/gi, '<\\/script')
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${CSP}"></head><body><script>
const WORKER_SOURCE = ${inject(JSON.stringify(workerSource))};
${inject(frameSource)}
</script></body></html>`
}

let srcdoc: string | null = null

/**
 * One hidden iframe (sandbox="allow-scripts", so it gets an opaque origin) per message.
 * The iframe starts a Web Worker that executes the compiled program.
 */
export class Sandbox {
  private iframe: HTMLIFrameElement
  private ready = false
  private queue: Record<string, unknown>[] = []
  private onWindowMessage: (event: MessageEvent) => void

  constructor(onMessage: (msg: SandboxMessage) => void) {
    srcdoc ??= buildSrcdoc()
    this.iframe = document.createElement('iframe')
    this.iframe.setAttribute('sandbox', 'allow-scripts')
    this.iframe.setAttribute('aria-hidden', 'true')
    this.iframe.style.display = 'none'
    this.iframe.srcdoc = srcdoc
    this.onWindowMessage = (event: MessageEvent) => {
      if (event.source !== this.iframe.contentWindow) return
      const data = event.data
      if (!data || data.__dil !== true) return
      if (data.kind === 'ready') {
        this.ready = true
        for (const m of this.queue) this.post(m)
        this.queue = []
      }
      onMessage(data as SandboxMessage)
    }
    window.addEventListener('message', this.onWindowMessage)
    document.body.appendChild(this.iframe)
  }

  send(msg: Record<string, unknown>) {
    if (this.ready) this.post(msg)
    else this.queue.push(msg)
  }

  private post(msg: Record<string, unknown>) {
    this.iframe.contentWindow?.postMessage({ __dil: true, ...msg }, '*')
  }

  dispose() {
    window.removeEventListener('message', this.onWindowMessage)
    this.iframe.remove()
  }
}
