/*
 * Picks the visualization style at startup. VIZ_STYLE (environment or .env files) is a built-in pack name
 * or a path to a JSON style file; unset means "default". The file is validated and resolved against the
 * packs it extends, then injected as __VIZ_STYLE__. A bad file stops dev and build with a list of problems.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv, type Plugin } from 'vite'
import { resolveStyle, type VizStyle } from '../src/components/visualization/theme/config.ts'

const PACKS_DIR = 'src/components/visualization/theme/packs'

function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    throw new Error(`Cannot read viz style ${file}: ${(e as Error).message}`)
  }
}

export function loadPacks(root: string): Record<string, unknown> {
  const dir = path.join(root, PACKS_DIR)
  return Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), readJson(path.join(dir, f))]))
}

/** Resolves a VIZ_STYLE value: a pack name, or a JSON path relative to `root`. Returns the style and the file it came from. */
export function selectStyle(value: string | undefined, root: string): { style: VizStyle; file?: string } {
  const packs = loadPacks(root)
  const choice = value?.trim() || 'default'
  if (!choice.endsWith('.json')) {
    if (!(choice in packs)) throw new Error(`VIZ_STYLE="${choice}" is not a style pack. Use one of ${Object.keys(packs).join(', ')}, or a path to a .json file.`)
    return { style: resolveStyle(packs[choice], packs, choice, choice) }
  }
  const file = path.resolve(root, choice)
  return { style: resolveStyle(readJson(file), packs, choice, path.basename(file, '.json')), file }
}

export function vizStyle(): Plugin {
  let file: string | undefined
  return {
    name: 'viz-style',
    config(_, { mode }) {
      const root = process.cwd()
      const value = process.env.VIZ_STYLE ?? loadEnv(mode, root, '').VIZ_STYLE
      const picked = selectStyle(value, root)
      file = picked.file
      console.log(`  viz style: ${picked.style.name}${file ? ' (' + path.relative(root, file) + ')' : ''}`)
      return { define: { __VIZ_STYLE__: JSON.stringify(picked.style) } }
    },
    configureServer(server) {
      if (!file) return
      server.watcher.add(file)
      server.watcher.on('change', (changed) => {
        if (path.resolve(changed) === file) server.restart()
      })
    },
  }
}
