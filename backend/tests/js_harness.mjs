// Evaluates compiled DIL programs with a minimal runtime and prints the resolved trees.
// Input (stdin): JSON array of { code, constants }. Output: JSON array of { tree } | { error }.
import { readFileSync } from 'node:fs'

const Fragment = Symbol('Fragment')

function run({ code, constants, bindings }) {
  let root = null
  const DIL = {
    useState: (init) => [init, () => {}],
    useConstants: () => constants,
    useAppData: (select) => select({ opGenui: { modelDataBindings: bindings ?? {} } }),
    render: (el) => {
      root = el
    },
  }
  const __dil = { jsx: (type, props, ...children) => ({ type, props: props ?? {}, children }), Fragment }
  new Function('DIL', '__dil', 'GenUI', code)(DIL, __dil, {})

  const resolve = (node) => {
    if (node === null || node === undefined || node === false) return []
    if (Array.isArray(node)) return node.flatMap(resolve)
    if (typeof node !== 'object') return [String(node)]
    if (typeof node.type === 'function') return resolve(node.type(node.props))
    const children = node.children.flatMap(resolve)
    if (node.type === Fragment) return children
    const props = Object.fromEntries(
      Object.entries(node.props).map(([k, v]) => [k, typeof v === 'function' ? '<fn>' : v]),
    )
    return [{ type: node.type, props, children }]
  }
  return { tree: resolve(root) }
}

const inputs = JSON.parse(readFileSync(0, 'utf8'))
const results = inputs.map((input) => {
  try {
    return run(input)
  } catch (e) {
    return { error: String(e) }
  }
})
process.stdout.write(JSON.stringify(results))
