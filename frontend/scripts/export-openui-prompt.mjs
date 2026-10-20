// Generates the OpenUI system prompt from the same library the frontend renders with,
// so the backend prompt and the client renderer can never drift apart.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openuiChatLibrary, openuiChatPromptOptions } from '@openuidev/react-ui/genui-lib'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, '../../backend/prompts/openui_system.txt')

const prompt = openuiChatLibrary.prompt({
  ...openuiChatPromptOptions,
  bindings: true,
})

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, prompt)
console.log(`Wrote ${prompt.length} chars to ${out}`)
