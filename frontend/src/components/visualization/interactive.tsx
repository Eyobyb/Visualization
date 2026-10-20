import { useId, useState, type FormEvent } from 'react'
import { Glyph, type IconName } from './Icon'
import { CardHead } from './shared'
import { cx, fillTemplate, fmt, normOption } from './utils'
import type { NumberFormat, OptionInput } from './types'

/** Sends a message to the model as a new user turn. */
export type SendToModel = (text: string) => void

function SentNote() {
  return <span className="ui-choices-sent"><Glyph name="check" size={14} />Sent to the assistant</span>
}

type ChoiceChipsProps<V extends string | number> = {
  /** The question being asked. */
  question?: string
  /** Bare values or `{ label, value, icon, description }`. */
  options: OptionInput<V>[]
  /** `cards` shows each option's description. */
  variant?: 'chips' | 'cards'
} & (
  | {
      /** Sends the formatted pick to the model. Once sent, the chips lock. */
      onSend: SendToModel
      /** Message template; `{choice}` is replaced by the picked label(s). */
      template?: string
      /** Allow several picks, sent together with one button. */
      multi?: boolean
      /** Label of the send button in multi-select mode. */
      submitLabel?: string
      value?: never
      onChange?: never
    }
  | {
      /** Bound mode: the chips act as a local filter instead of messaging the model. */
      value: V
      onChange: (value: V) => void
      onSend?: never
      template?: never
      multi?: never
      submitLabel?: never
    }
)

/**
 * Tappable options for a clarifying question. With `onSend`, a tap sends the choice to the model;
 * with `value`/`onChange`, the chips filter locally like a segmented control.
 *
 * @example
 * <ChoiceChips question="Which period should I analyse?" options={['This month', 'Last quarter']} template="Analyse sales for {choice}" onSend={send} />
 * @example
 * <ChoiceChips options={['Apparel', 'Coffee', 'Home']} value={category} onChange={setCategory} />
 */
export function ChoiceChips<V extends string | number>(props: ChoiceChipsProps<V>) {
  const { question, options, variant = 'chips' } = props
  const opts = options.map(normOption)
  const [picked, setPicked] = useState<string[]>([])
  const [sent, setSent] = useState<string[] | null>(null)
  const bound = props.onChange !== undefined

  const send = (labels: string[]) => {
    if (!props.onSend) return
    props.onSend(fillTemplate(props.template ?? '{choice}', { choice: labels.join(', ') }))
    setSent(labels)
  }
  const isOn = (o: (typeof opts)[number]) =>
    bound ? props.value === o.value : sent ? sent.includes(o.label) : picked.includes(o.label)
  const click = (o: (typeof opts)[number]) => {
    if (props.onChange) return props.onChange(o.value)
    if (sent) return
    if (props.multi) setPicked((s) => (s.includes(o.label) ? s.filter((x) => x !== o.label) : [...s, o.label]))
    else send([o.label])
  }
  const cards = variant === 'cards'

  return (
    <div className="ui-choices">
      {question && <p className="ui-choices-q">{question}</p>}
      <div className={cx('ui-choices-opts', cards && 'cards')} role="group" aria-label={question || 'Options'}>
        {opts.map((o, i) => (
          <button key={i} type="button" className="ui-chip" aria-pressed={isOn(o)} disabled={!bound && !!sent && !isOn(o)} onClick={() => click(o)}>
            {o.icon && <Glyph name={o.icon} size={15} />}
            {cards
              ? <span className="pi"><b className="pi-title">{o.label}</b>{o.description && <span className="pi-text">{o.description}</span>}</span>
              : o.label}
          </button>
        ))}
      </div>
      {props.multi && !sent && (
        <div>
          <button type="button" className="ui-btn v-solid s-sm" disabled={!picked.length} onClick={() => send(picked)}>{props.submitLabel ?? 'Send'}</button>
        </div>
      )}
      {sent && <p className="ui-choices-sent"><Glyph name="check" size={14} />Sent to the assistant</p>}
    </div>
  )
}

/** One form field. `select` uses `options`; `textarea` spans both columns unless `wide` is false. */
export interface FormField {
  /** Key used in the template, such as `{location}`. */
  name: string
  label?: string
  type?: 'text' | 'number' | 'email' | 'tel' | 'date' | 'select' | 'textarea'
  options?: OptionInput[]
  required?: boolean
  placeholder?: string
  /** Unit after the input. */
  suffix?: string
  default?: string
  /** Span both columns. */
  wide?: boolean
}

/**
 * Several fields submitted together as one message to the model. Required fields, emails and numbers
 * are validated before sending.
 *
 * @example
 * <Form
 *   title="Schedule a courier pickup"
 *   icon="truck"
 *   fields={[{ name: 'location', label: 'Pickup location', type: 'select', options: ['Bole warehouse'], required: true }, { name: 'date', type: 'date', required: true }]}
 *   template="Schedule a pickup from {location} on {date}"
 *   onSend={send}
 * />
 */
export function Form({ fields, title, subtitle, icon, submitLabel = 'Submit', template, onSend }: {
  fields: FormField[]
  title?: string
  subtitle?: string
  icon?: IconName
  submitLabel?: string
  /** Message sent; `{fieldName}` is replaced by its value. Defaults to "Label: value" lines. */
  template?: string
  onSend: SendToModel
}) {
  const base = useId()
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.name, f.default ?? ''])))
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)

  const change = (k: string, v: string) => {
    setVals((s) => ({ ...s, [k]: v }))
    setErrs((e) => {
      if (!e[k]) return e
      const { [k]: _, ...rest } = e
      return rest
    })
    setSent(false)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    for (const f of fields) {
      const v = (vals[f.name] ?? '').trim()
      if (f.required && !v) er[f.name] = 'Enter ' + (f.label ?? f.name).toLowerCase()
      else if (v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) er[f.name] = 'Enter an email like name@example.com'
      else if (v && f.type === 'number' && !Number.isFinite(+v)) er[f.name] = 'Enter a number'
    }
    setErrs(er)
    if (Object.keys(er).length) return
    const shown = Object.fromEntries(fields.map((f) => {
      const v = vals[f.name]
      const opt = f.type === 'select' ? (f.options ?? []).map(normOption).find((x) => String(x.value) === String(v)) : undefined
      return [f.name, opt ? opt.label : v]
    }))
    const text = template
      ? fillTemplate(template, shown)
      : [title, ...fields.filter((f) => shown[f.name] !== '').map((f) => `${f.label ?? f.name}: ${shown[f.name]}`)].filter(Boolean).join('\n')
    onSend(text)
    setSent(true)
  }

  const control = (f: FormField) => {
    const id = `${base}-${f.name}`
    const common = {
      id,
      value: vals[f.name] ?? '',
      'aria-invalid': !!errs[f.name],
      'aria-describedby': errs[f.name] ? id + '-err' : undefined,
      onChange: (e: { target: { value: string } }) => change(f.name, e.target.value),
    }
    if (f.type === 'textarea') return <textarea {...common} className="ui-textarea" rows={3} placeholder={f.placeholder} />
    if (f.type === 'select') {
      return (
        <div className="ui-selectwrap">
          <select {...common} className="ui-select">
            <option value="">{f.placeholder || 'Choose…'}</option>
            {(f.options ?? []).map(normOption).map((o, i) => <option key={i} value={String(o.value)}>{o.label}</option>)}
          </select>
          <Glyph name="chevron-down" size={16} />
        </div>
      )
    }
    const type = f.type && ['email', 'number', 'date', 'tel'].includes(f.type) ? f.type : 'text'
    return (
      <div className="ui-inputwrap">
        <input {...common} className="ui-input" type={type} inputMode={f.type === 'number' ? 'decimal' : undefined} placeholder={f.placeholder} />
        {f.suffix && <span className="ui-affix">{f.suffix}</span>}
      </div>
    )
  }

  return (
    <form className="ui-card pad ui-form" onSubmit={submit} noValidate>
      {(title || icon) && <CardHead title={title} subtitle={subtitle} icon={icon} />}
      <div className="ui-form-grid">
        {fields.map((f) => (
          <div key={f.name} className={cx('ui-field', f.wide !== false && (f.type === 'textarea' || f.wide) && 'wide')}>
            <label className="ui-label" htmlFor={`${base}-${f.name}`}>
              {f.label ?? f.name}
              {f.required && <span className="ui-req" aria-hidden> *</span>}
            </label>
            {control(f)}
            {errs[f.name] && <span className="ui-err" id={`${base}-${f.name}-err`} role="alert">{errs[f.name]}</span>}
          </div>
        ))}
      </div>
      <div className="ui-form-foot">
        <button type="submit" className="ui-btn v-solid s-md"><Glyph name="send" size={15} />{sent ? 'Send again' : submitLabel}</button>
        {sent && <SentNote />}
      </div>
    </form>
  )
}

/** A fact about the pending action. */
export interface ApprovalDetail {
  label: string
  value: string | number
  format?: NumberFormat
}

/**
 * Human in the loop: the agent shows what it is about to do and waits for Approve, Edit or Cancel.
 * The decision, and any edited preview, is sent back to the model.
 *
 * @example
 * <ApprovalCard
 *   title="Post the restock announcement"
 *   action="Publish to your Telegram channel"
 *   preview="New stock just landed: hand-woven netela scarves..."
 *   warning="Posts go to every subscriber immediately."
 *   approveLabel="Post now"
 *   onSend={send}
 * />
 */
export function ApprovalCard({
  title, action, details = [], preview = '', editable = true, warning, approveLabel = 'Approve',
  approveMessage = 'Approved: {title}', cancelMessage = 'Cancelled: {title}', icon = 'zap', onSend,
}: {
  /** The action, as a short verb phrase. */
  title: string
  /** Where and how it happens. */
  action?: string
  details?: ApprovalDetail[]
  /** The content that will be sent or posted. */
  preview?: string
  /** Let the user edit the preview before approving. */
  editable?: boolean
  /** A consequence to flag, such as "This cannot be undone". */
  warning?: string
  approveLabel?: string
  /** Message sent on approve; `{title}` is replaced. */
  approveMessage?: string
  /** Message sent on cancel; `{title}` is replaced. */
  cancelMessage?: string
  icon?: IconName
  onSend: SendToModel
}) {
  const id = useId()
  const [status, setStatus] = useState<'pending' | 'approved' | 'cancelled'>('pending')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(preview)

  const decide = (ok: boolean) => {
    const edited = draft !== preview
    onSend(ok
      ? fillTemplate(approveMessage, { title }) + (edited ? '\nUse this edited version:\n' + draft : '')
      : fillTemplate(cancelMessage, { title }))
    setStatus(ok ? 'approved' : 'cancelled')
    setEditing(false)
  }

  const badge = status === 'pending'
    ? <span className="ui-badge v-soft t-warning"><Glyph name="clock" size={13} />Needs approval</span>
    : status === 'approved'
      ? <span className="ui-badge v-soft t-success"><Glyph name="check" size={13} />Approved</span>
      : <span className="ui-badge v-soft t-muted"><Glyph name="x" size={13} />Cancelled</span>

  return (
    <section className={cx('ui-card pad ui-approval', 'st-' + status)}>
      <div className="ui-approval-head"><CardHead title={title} subtitle={action} icon={icon} />{badge}</div>
      {details.length > 0 && (
        <dl className="ui-facts compact">
          {details.map((o, i) => (
            <div key={i} className="fact">
              <dt>{o.label}</dt>
              <dd>{typeof o.value === 'number' ? fmt(o.value, o.format) : o.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {preview !== '' && (editing ? (
        <div className="ui-field">
          <label className="ui-label" htmlFor={id}>Edit before approving</label>
          <textarea id={id} className="ui-textarea" rows={5} value={draft} onChange={(e) => setDraft(e.target.value)} />
        </div>
      ) : (
        <div className="ui-approval-preview">
          <span className="ui-label">{draft !== preview ? 'Preview (edited)' : 'Preview'}</span>
          <p>{draft}</p>
        </div>
      ))}
      {warning && status === 'pending' && <p className="ui-approval-warn"><Glyph name="alert-triangle" size={15} />{warning}</p>}
      {status === 'pending' ? (
        <div className="ui-approval-actions">
          <button type="button" className="ui-btn v-solid s-md" onClick={() => decide(true)}><Glyph name="check" size={15} />{approveLabel}</button>
          {editable && preview !== '' && (
            <button type="button" className="ui-btn v-outline s-md" onClick={() => setEditing((x) => !x)}>{editing ? 'Done editing' : 'Edit'}</button>
          )}
          <button type="button" className="ui-btn v-ghost s-md" onClick={() => decide(false)}>Cancel</button>
        </div>
      ) : (
        <p className="ui-caption t-muted">{status === 'approved' ? 'The assistant was told to go ahead.' : 'The assistant was told not to do this.'}</p>
      )}
    </section>
  )
}
