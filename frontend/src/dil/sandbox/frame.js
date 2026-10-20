// Runs inside the hidden sandboxed iframe (opaque origin). Starts the worker,
// relays messages between the host page and the worker, and restarts the worker
// if it stops responding. WORKER_SOURCE is injected when the srcdoc is built.
'use strict'
;(() => {
  const WATCHDOG_MS = 1500
  const parentWindow = window.parent
  const workerUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }))

  let worker = null
  let watchdog = null
  let lastGood = null // { code, constants, version }
  let lastState = {}
  let lastBindings = null
  const programs = new Map()

  const toHost = (msg) => parentWindow.postMessage({ __dil: true, ...msg }, '*')

  function arm() {
    clearTimeout(watchdog)
    watchdog = setTimeout(() => {
      toHost({ kind: 'error', phase: 'watchdog', message: `Worker unresponsive for ${WATCHDOG_MS}ms; restarted with the last good program` })
      start(true)
    }, WATCHDOG_MS)
  }

  function disarm() {
    clearTimeout(watchdog)
    watchdog = null
  }

  function start(replay) {
    if (worker) worker.terminate()
    disarm()
    worker = new Worker(workerUrl)
    worker.onmessage = (event) => {
      const msg = event.data
      if (msg.kind === 'ready') {
        if (replay && lastGood) {
          worker.postMessage({ kind: 'setState', state: lastState })
          if (lastBindings) worker.postMessage({ kind: 'setData', bindings: lastBindings })
          worker.postMessage({ kind: 'setProgram', ...lastGood })
          arm()
        } else {
          toHost({ kind: 'ready' })
        }
        return
      }
      if (msg.kind === 'tree') {
        disarm()
        lastState = msg.state
        const program = programs.get(msg.version)
        if (program) {
          lastGood = program
          for (const v of programs.keys()) if (v < msg.version) programs.delete(v)
        }
      }
      if (msg.kind === 'error' || msg.kind === 'idle') disarm()
      toHost(msg)
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== parentWindow) return
    const msg = event.data
    if (!msg || msg.__dil !== true || !worker) return
    if (msg.kind === 'setProgram') {
      programs.set(msg.version, { code: msg.code, constants: msg.constants, version: msg.version })
    } else if (msg.kind === 'setData') {
      lastBindings = msg.bindings
    } else if (msg.kind === 'setConstants' && lastGood) {
      lastGood = { ...lastGood, constants: msg.constants }
    }
    const { __dil, ...rest } = msg
    worker.postMessage(rest)
    if (msg.kind !== 'ping') arm()
  })

  start(false)
})()
