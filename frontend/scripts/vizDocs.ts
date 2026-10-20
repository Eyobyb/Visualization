import path from 'node:path'
import ts from 'typescript'
import type { Plugin } from 'vite'

const VIRTUAL_ID = 'virtual:viz-docs'
const RESOLVED_ID = '\0' + VIRTUAL_ID

const FAMILY_BY_FILE: Record<string, string> = {
  shared: 'Foundations', layout: 'Layout', text: 'Text', prose: 'Prose', inputs: 'Inputs',
  interactive: 'Two-way', data: 'Data', Chart: 'Data', cards: 'Cards', media: 'Media',
}
const FAMILIES = ['Foundations', 'Layout', 'Text', 'Prose', 'Inputs', 'Two-way', 'Data', 'Cards', 'Media']

interface PropDoc { name: string; type: string; required: boolean; default?: string; description: string }
interface ComponentDoc { name: string; family: string; description: string; props: PropDoc[] }
interface ExampleDoc { name: string; component: string; label: string; code: string }

const FORMAT = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType
const LITERAL = ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral | ts.TypeFlags.BooleanLiteral

const withoutNullish = (s: string) => s.replace(/\s*\|\s*(undefined|null)\b/g, '').replace(/^(undefined|null)\s*\|\s*/, '')

/**
 * The alternatives of a prop type with `undefined` removed. Short literal unions are spelled out; anything else is shown
 * as written in the source, so names like `ReactNode` and `IconName` survive. A prop that is only ever `never`
 * (a placeholder in a union of prop shapes) yields no parts.
 */
function typeParts(checker: ts.TypeChecker, sym: ts.Symbol, at: ts.Node): string[] {
  const t = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(sym, at))
  if (t.flags & ts.TypeFlags.Never) return []
  if (t.isUnion() && t.types.length <= 8 && t.types.every((m) => m.flags & LITERAL) && !(t.flags & ts.TypeFlags.Boolean)) {
    return t.types.map((m) => checker.typeToString(m, at, FORMAT))
  }
  const decl = sym.valueDeclaration
  if (decl && (ts.isPropertySignature(decl) || ts.isPropertyDeclaration(decl)) && decl.type) return [withoutNullish(decl.type.getText())]
  return [checker.typeToString(t, at, FORMAT)]
}

const joinParts = (parts: string[]) => (parts.length > 1 ? parts.map((p) => (p.includes('=>') ? `(${p})` : p)) : parts).join(' | ')

/** Initializers from `{ a = 1 }` in the parameter list, or from `const { a = 1 } = props` in the body. */
function collectDefaults(fn: ts.FunctionDeclaration) {
  const out: Record<string, string> = {}
  const read = (pattern: ts.ObjectBindingPattern) => {
    for (const el of pattern.elements) {
      if (!el.initializer) continue
      const key = el.propertyName ? el.propertyName.getText() : el.name.getText()
      out[key] = el.initializer.getText()
    }
  }
  const param = fn.parameters[0]
  if (!param) return out
  if (ts.isObjectBindingPattern(param.name)) read(param.name)
  else if (ts.isIdentifier(param.name) && fn.body) {
    const paramName = param.name.text
    for (const st of fn.body.statements) {
      if (!ts.isVariableStatement(st)) continue
      for (const d of st.declarationList.declarations) {
        if (ts.isObjectBindingPattern(d.name) && d.initializer && ts.isIdentifier(d.initializer) && d.initializer.text === paramName) read(d.name)
      }
    }
  }
  return out
}

/**
 * Props of a component, merged across the members of a union props type (as in Input or ChoiceChips).
 * `generics` maps type parameter names to their constraints so `V` reads as `string | number`.
 */
function propsOf(checker: ts.TypeChecker, propsType: ts.Type, at: ts.Node, defaults: Record<string, string>, generics: Record<string, string>): PropDoc[] {
  const members = propsType.isUnion() ? propsType.types : [propsType]
  const found = new Map<string, { parts: string[]; required: boolean; count: number; description: string }>()
  const resolve = (s: string) => Object.entries(generics).reduce((acc, [name, c]) => acc.replace(new RegExp(`\\b${name}\\b`, 'g'), c), s)
  for (const member of members) {
    for (const sym of member.getProperties()) {
      const parts = typeParts(checker, sym, at).map(resolve)
      if (!parts.length) continue
      const optional = (sym.flags & ts.SymbolFlags.Optional) !== 0
      const prev = found.get(sym.name)
      if (prev) {
        prev.required &&= !optional
        prev.count++
        for (const p of parts) if (!prev.parts.includes(p)) prev.parts.push(p)
      } else {
        found.set(sym.name, { parts, required: !optional, count: 1, description: ts.displayPartsToString(sym.getDocumentationComment(checker)) })
      }
    }
  }
  return [...found].map(([name, p]) => ({
    name,
    type: joinParts(p.parts),
    required: p.required && p.count === members.length,
    default: defaults[name],
    description: p.description,
  }))
}

function bodyCode(fn: ts.FunctionDeclaration, src: ts.SourceFile) {
  const text = src.getFullText()
  const lines: string[] = []
  for (const st of fn.body?.statements ?? []) {
    if (ts.isReturnStatement(st) && st.expression) {
      let e: ts.Expression = st.expression
      while (ts.isParenthesizedExpression(e)) e = e.expression
      lines.push(text.slice(e.getStart(src), e.getEnd()))
    } else {
      lines.push(text.slice(st.getStart(src), st.getEnd()))
    }
  }
  return dedent(lines.join('\n'))
}

function dedent(s: string) {
  const rows = s.split('\n')
  const indents = rows.slice(1).filter((r) => r.trim()).map((r) => r.match(/^ */)![0].length)
  const cut = indents.length ? Math.min(...indents) : 0
  return [rows[0], ...rows.slice(1).map((r) => r.slice(Math.min(cut, r.match(/^ */)![0].length)))].join('\n')
}

function extract(vizDir: string, examplesFile: string) {
  const indexFile = path.join(vizDir, 'index.ts')
  const program = ts.createProgram([indexFile, examplesFile], {
    jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, allowImportingTsExtensions: true, noEmit: true, skipLibCheck: true, strict: true,
  })
  const checker = program.getTypeChecker()
  const indexSym = checker.getSymbolAtLocation(program.getSourceFile(indexFile)!)!

  const components: ComponentDoc[] = []
  for (const exp of checker.getExportsOfModule(indexSym)) {
    const sym = exp.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exp) : exp
    const decl = sym.declarations?.[0]
    if (!decl || !/^[A-Z]/.test(exp.name)) continue
    const file = path.basename(decl.getSourceFile().fileName).replace(/\.tsx?$/, '')
    const family = FAMILY_BY_FILE[file]
    if (!family) continue
    let props: PropDoc[] = []
    if (ts.isFunctionDeclaration(decl) && decl.parameters[0]) {
      const generics = Object.fromEntries((decl.typeParameters ?? []).map((tp) => [tp.name.text, tp.constraint ? tp.constraint.getText() : 'unknown']))
      props = propsOf(checker, checker.getTypeAtLocation(decl.parameters[0]), decl, collectDefaults(decl), generics)
    } else if (ts.isClassDeclaration(decl)) {
      const arg = decl.heritageClauses?.[0]?.types[0]?.typeArguments?.[0]
      if (arg) props = propsOf(checker, checker.getTypeFromTypeNode(arg), decl, {}, {})
    } else continue
    const description = ts.displayPartsToString(sym.getDocumentationComment(checker))
    components.push({ name: exp.name, family, description, props })
  }
  const pos = (c: ComponentDoc) => FAMILIES.indexOf(c.family)
  components.sort((a, b) => pos(a) - pos(b))

  const names = new Set(components.map((c) => c.name))
  const examples: ExampleDoc[] = []
  const exSrc = program.getSourceFile(examplesFile)!
  for (const st of exSrc.statements) {
    if (!ts.isFunctionDeclaration(st) || !st.name || !st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue
    const [component, ...rest] = st.name.text.split('_')
    if (!names.has(component)) continue
    examples.push({ name: st.name.text, component, label: rest.join(' '), code: bodyCode(st, exSrc) })
  }
  return { families: FAMILIES.filter((f) => components.some((c) => c.family === f)), components, examples }
}

/**
 * Serves `virtual:viz-docs`: component descriptions and prop tables read from the docstrings and types in
 * `src/components/visualization`, plus the source of every example in `src/catalog/examples.tsx`.
 */
export function vizDocs(): Plugin {
  let root = process.cwd()
  const dirs = () => ({ vizDir: path.join(root, 'src/components/visualization'), examplesFile: path.join(root, 'src/catalog/examples.tsx') })
  return {
    name: 'viz-docs',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    load(id) {
      if (id !== RESOLVED_ID) return
      const { vizDir, examplesFile } = dirs()
      return 'export default ' + JSON.stringify(extract(vizDir, examplesFile))
    },
    handleHotUpdate({ file, server, modules }) {
      const { vizDir, examplesFile } = dirs()
      if (!file.startsWith(vizDir) && file !== examplesFile) return
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
      if (!mod) return
      server.moduleGraph.invalidateModule(mod)
      return [...modules, mod]
    },
  }
}
