import { useState, type FormEvent } from 'react'
import { PlainColumn } from './columns/PlainColumn'
import { OpenUIColumn } from './columns/OpenUIColumn'
import { DILColumn } from './columns/DILColumn'
import './App.css'

export type Submission = { id: number; text: string }

const SAMPLES = [
  'Team plan pricing calculator: $29 per seat, annual billing gets 20% off',
  'Compare 3 popular laptops for a software developer',
  'Explain how a bike drivetrain works',
  'Bill splitter for 4 people with tip',
]

export default function App() {
  const [text, setText] = useState('')
  const [submission, setSubmission] = useState<Submission | null>(null)

  const submit = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setSubmission({ id: Date.now(), text: trimmed })
    setText('')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit(text)
  }

  return (
    <div className="app">
      <form className="prompt-bar" onSubmit={onSubmit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask once, compare three ways of answering..."
          autoFocus
        />
        <button type="submit" disabled={!text.trim()}>
          Send to all
        </button>
        <div className="samples">
          {SAMPLES.map((s) => (
            <button type="button" key={s} onClick={() => submit(s)}>
              {s}
            </button>
          ))}
        </div>
      </form>
      <main className="columns">
        <PlainColumn submission={submission} />
        <OpenUIColumn submission={submission} />
        <DILColumn submission={submission} />
      </main>
    </div>
  )
}
