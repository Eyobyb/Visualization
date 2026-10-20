// DIL runtime. Runs inside a Web Worker started by a sandboxed, opaque-origin iframe.
// It evaluates compiled programs, keeps hook state in keyed slots, and posts a
// serialisable tree. It never touches a DOM; functions stay here and are sent as ids.
'use strict'

const post = self.postMessage.bind(self)
const RealFunction = Function

// ---- lockdown: no network, timers, storage, messaging or nested workers ----
const BLOCKED = [
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'setTimeout', 'setInterval',
  'clearTimeout', 'clearInterval', 'indexedDB', 'caches', 'BroadcastChannel', 'Worker', 'SharedWorker',
  'navigator', 'location', 'postMessage', 'close', 'WebTransport', 'Request', 'Response', 'Headers',
]
for (const name of BLOCKED) {
  try {
    Object.defineProperty(self, name, { value: undefined, writable: false, configurable: false })
  } catch {
    /* some names are not configurable in every engine */
  }
}

const Fragment = Object.freeze({ fragment: true })

// ---- runtime state ----
let program = null // { root, version }
let constants = {}
let modelDataBindings = Object.freeze({})
let goodVersion = -1
const slots = new Map()
let autoSlot = 0
// Function ids are scoped to the render that produced them (`fn#<render>.<n>`), so an event the
// host sends from a tree that is already stale still reaches the function the user saw.
const KEPT_RENDERS = 8
const fnTables = new Map()
let fnTable = new Map()
let renderCount = 0
let fnCounter = 0
let dirty = false

const DIL = Object.freeze({
  useState(initial, options) {
    const key = options && typeof options.key === 'string' ? options.key : `__auto${autoSlot++}`
    if (!slots.has(key)) slots.set(key, typeof initial === 'function' ? initial() : initial)
    const setter = (next) => {
      const prev = slots.get(key)
      const value = typeof next === 'function' ? next(prev) : next
      if (!Object.is(prev, value)) {
        slots.set(key, value)
        dirty = true
      }
    }
    return [slots.get(key), setter]
  },
  useConstants: () => constants,
  useAppData: (select) => select({ opGenui: { componentResults: {}, modelDataBindings } }),
  render(element) {
    pendingRoot = element
  },
})

const __dil = Object.freeze({
  jsx: (type, props, ...children) => ({ type, props: props || {}, children }),
  Fragment,
})

const GenUI = Object.freeze({
  issueNewTurn(text) {
    if (arguments.length !== 1 || typeof text !== 'string') throw new TypeError('issueNewTurn(text: string)')
    post({ kind: 'action', name: 'issueNewTurn', arg: text.slice(0, 4000) })
  },
  copy(text) {
    if (arguments.length !== 1 || typeof text !== 'string') throw new TypeError('copy(text: string)')
    post({ kind: 'action', name: 'copy', arg: text.slice(0, 20000) })
  },
})

let pendingRoot = null

function deepFreeze(value, depth = 0) {
  if (value === null || typeof value !== 'object' || depth > 8) return value
  for (const k of Object.keys(value)) deepFreeze(value[k], depth + 1)
  return Object.freeze(value)
}

// ---- serialisation ----
function serializeValue(v, depth) {
  if (typeof v === 'function') {
    const id = `fn#${renderCount}.${++fnCounter}`
    fnTable.set(id, v)
    return { __fn: id }
  }
  if (v === null || typeof v !== 'object') return typeof v === 'bigint' ? Number(v) : v
  if (depth > 8) return null
  if (Array.isArray(v)) return v.map((x) => serializeValue(x, depth + 1))
  const out = {}
  for (const k of Object.keys(v)) out[k] = serializeValue(v[k], depth + 1)
  return out
}

function resolve(node, out, depth) {
  if (depth > 200) throw new Error('Tree too deep')
  if (node === null || node === undefined || node === false || node === true) return
  if (Array.isArray(node)) {
    for (const n of node) resolve(n, out, depth + 1)
    return
  }
  if (typeof node !== 'object') {
    out.push(String(node))
    return
  }
  if (typeof node.type === 'function') {
    resolve(node.type(node.props), out, depth + 1)
    return
  }
  const children = []
  for (const c of node.children || []) resolve(c, children, depth + 1)
  if (node.type === Fragment) {
    out.push(...children)
    return
  }
  if (typeof node.type !== 'string') return
  const props = {}
  for (const k of Object.keys(node.props)) {
    if (k !== 'key') props[k] = serializeValue(node.props[k], 0)
  }
  out.push({ t: node.type, p: props, c: children })
}

function renderTree() {
  autoSlot = 0
  renderCount++
  fnTable = new Map()
  fnCounter = 0
  const out = []
  resolve(program.root, out, 0)
  fnTables.set(renderCount, fnTable)
  fnTables.delete(renderCount - KEPT_RENDERS)
  return out
}

function publish() {
  const tree = renderTree()
  post({ kind: 'tree', tree, version: goodVersion, state: Object.fromEntries(slots) })
}

// ---- programs ----
function setProgram(code, version) {
  const previous = program
  try {
    pendingRoot = null
    const fn = new RealFunction('DIL', '__dil', 'GenUI', '"use strict";\n' + code)
    fn(DIL, __dil, GenUI)
    if (!pendingRoot) throw new Error('Program did not call DIL.render')
    program = { root: pendingRoot, version }
    const prevGood = goodVersion
    goodVersion = version
    try {
      publish()
    } catch (e) {
      program = previous
      goodVersion = prevGood
      throw e
    }
  } catch (e) {
    // Keep showing the last program that worked.
    post({ kind: 'error', phase: 'program', version, message: String(e && e.message ? e.message : e) })
  }
}

function invoke(fnId, args) {
  const match = /^fn#(\d+)\.\d+$/.exec(String(fnId))
  const fn = match ? fnTables.get(Number(match[1]))?.get(fnId) : undefined
  if (!fn) {
    post({ kind: 'idle' })
    return
  }
  dirty = false
  try {
    fn(...(Array.isArray(args) ? args : []))
  } catch (e) {
    post({ kind: 'error', phase: 'event', message: String(e && e.message ? e.message : e) })
  }
  if (dirty && program) {
    try {
      publish()
    } catch (e) {
      post({ kind: 'error', phase: 'render', message: String(e && e.message ? e.message : e) })
    }
  }
  post({ kind: 'idle' })
}

self.onmessage = (event) => {
  const msg = event.data
  if (!msg || typeof msg !== 'object') return
  switch (msg.kind) {
    case 'setProgram':
      constants = Object.freeze({ ...(msg.constants || {}) })
      setProgram(String(msg.code), msg.version)
      break
    case 'setConstants':
      constants = Object.freeze({ ...(msg.constants || {}) })
      if (!program) {
        post({ kind: 'idle' })
        break
      }
      try {
        publish()
      } catch (e) {
        post({ kind: 'error', phase: 'render', message: String(e) })
      }
      break
    case 'setData':
      modelDataBindings = deepFreeze({ ...(msg.bindings || {}) })
      if (!program) {
        post({ kind: 'idle' })
        break
      }
      try {
        publish()
      } catch (e) {
        post({ kind: 'error', phase: 'render', message: String(e) })
      }
      break
    case 'setState':
      for (const [k, v] of Object.entries(msg.state || {})) slots.set(k, v)
      break
    case 'invoke':
      invoke(msg.fnId, msg.args)
      break
    case 'ping':
      post({ kind: 'pong' })
      break
  }
}

// Freeze shared prototypes last so the program cannot pollute them.
for (const proto of [Object.prototype, Array.prototype, Function.prototype, String.prototype, Number.prototype]) {
  Object.freeze(proto)
}
post({ kind: 'ready' })
