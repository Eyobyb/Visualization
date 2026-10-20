import { useId } from 'react'
import { Glyph, type IconName } from './Icon'
import { cx, fmt, normOption, num } from './utils'
import type { NumberFormat, OptionInput } from './types'

/**
 * Runs an action on click. Use one `solid` button per group and quieter variants for the rest.
 *
 * @example <Button label="Ask about Sidama" onClick={() => send('Why did Sidama grow so fast?')} />
 */
export function Button({ label, onClick, variant = 'solid', icon, size = 'md', block = false, disabled = false }: {
  label: string
  onClick?: () => void
  variant?: 'solid' | 'outline' | 'soft' | 'ghost' | 'danger'
  /** Leading icon. */
  icon?: IconName
  size?: 'sm' | 'md' | 'lg'
  /** Stretch to the full width of the container. */
  block?: boolean
  disabled?: boolean
}) {
  return (
    <button type="button" className={cx('ui-btn', 'v-' + variant, 's-' + size, block && 'is-block')} disabled={disabled} onClick={onClick}>
      {icon && <Glyph name={icon} size={16} />}
      <span>{label}</span>
    </button>
  )
}

interface InputBase {
  label?: string
  placeholder?: string
  /** Text before the value, such as a currency. */
  prefix?: string
  /** Text after the value, such as a unit. */
  suffix?: string
}

/**
 * Free entry of one text or number value. Prefer Slider for bounded numbers.
 * An emptied number field reports 0.
 *
 * @example <Input type="number" value={budget} onChange={setBudget} label="Ad budget" suffix="ETB" />
 */
export function Input(props: InputBase & (
  | { type?: 'text'; value: string; onChange: (value: string) => void }
  | { type: 'number'; value: number; onChange: (value: number) => void; min?: number; max?: number }
)) {
  const id = useId()
  const isNum = props.type === 'number'
  return (
    <div className="ui-field">
      {props.label && <label className="ui-label" htmlFor={id}>{props.label}</label>}
      <div className="ui-inputwrap">
        {props.prefix && <span className="ui-affix">{props.prefix}</span>}
        <input
          id={id}
          className="ui-input"
          type={isNum ? 'number' : 'text'}
          inputMode={isNum ? 'decimal' : undefined}
          value={props.value ?? ''}
          placeholder={props.placeholder}
          min={props.type === 'number' ? props.min : undefined}
          max={props.type === 'number' ? props.max : undefined}
          onChange={(e) => {
            if (props.type === 'number') props.onChange(e.target.value === '' ? 0 : +e.target.value)
            else props.onChange(e.target.value)
          }}
        />
        {props.suffix && <span className="ui-affix">{props.suffix}</span>}
      </div>
    </div>
  )
}

/**
 * Picks one value from a dropdown. Use it when there are more than five options.
 *
 * @example <Select value={region} onChange={setRegion} options={['Oromia', 'Amhara', 'Sidama']} label="Region" />
 */
export function Select<V extends string | number>({ value, onChange, options, label }: {
  value: V | undefined
  onChange: (value: V) => void
  /** Bare values or `{ value, label }`. */
  options: OptionInput<V>[]
  label?: string
}) {
  const id = useId()
  const opts = options.map(normOption)
  const idx = opts.findIndex((o) => o.value === value)
  return (
    <div className="ui-field">
      {label && <label className="ui-label" htmlFor={id}>{label}</label>}
      <div className="ui-selectwrap">
        <select id={id} className="ui-select" value={idx < 0 ? '' : String(idx)} onChange={(e) => onChange(opts[+e.target.value].value)}>
          {idx < 0 && <option value="" disabled>Choose…</option>}
          {opts.map((o, i) => <option key={i} value={String(i)}>{o.label}</option>)}
        </select>
        <Glyph name="chevron-down" size={16} />
      </div>
    </div>
  )
}

/**
 * Switches a view among two to five options shown as one pill-shaped strip.
 *
 * @example <SegmentedControl value={period} onChange={setPeriod} options={['Jul', 'Aug', 'Sep']} />
 */
export function SegmentedControl<V extends string | number>({ value, onChange, options, label }: {
  value: V | undefined
  onChange: (value: V) => void
  /** Two to five bare values or `{ value, label, icon }`. */
  options: OptionInput<V>[]
  label?: string
}) {
  return (
    <div className="ui-field">
      {label && <span className="ui-label">{label}</span>}
      <div className="ui-seg" role="radiogroup" aria-label={label || 'Options'}>
        {options.map(normOption).map((o, i) => (
          <button key={i} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
            {o.icon && <Glyph name={o.icon} size={14} />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Explores a bounded number with a drag handle. The best "what if" control.
 *
 * @example <Slider value={guests} onChange={setGuests} min={2} max={20} label="Guests" />
 */
export function Slider({ value, onChange, min = 0, max = 100, step = 1, label, format, suffix, showValue = true }: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  /** Display format of the current value and the range ends. */
  format?: NumberFormat
  /** Unit after the value when no `format` is set. */
  suffix?: string
  /** Show the current value above the track. */
  showValue?: boolean
}) {
  const id = useId()
  const val = num(value)
  const shown = format ? fmt(val, format) : fmt(val) + (suffix ? ' ' + suffix : '')
  return (
    <div className="ui-field">
      <div className="ui-slider-top">
        <label className="ui-label" htmlFor={id}>{label ?? ''}</label>
        {showValue && <output className="ui-slider-val" htmlFor={id}>{shown}</output>}
      </div>
      <input id={id} type="range" className="ui-range" min={min} max={max} step={step} value={val} onChange={(e) => onChange(+e.target.value)} />
      <div className="ui-slider-ends"><span>{fmt(min, format)}</span><span>{fmt(max, format)}</span></div>
    </div>
  )
}

/**
 * Toggles one item on or off with a native checkbox.
 *
 * @example <Checkbox checked={showForecast} onChange={setShowForecast} label="Show the October forecast" />
 */
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  const id = useId()
  return (
    <label className="ui-check" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

/**
 * A single on/off setting drawn as a sliding switch.
 *
 * @example <Switch checked={includeVat} onChange={setIncludeVat} label="Include 15% VAT" />
 */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="ui-switch" onClick={() => onChange(!checked)}>
      <span className="track"><span className="knob" /></span>
      <span>{label}</span>
    </button>
  )
}

/**
 * One choice where each option needs a description. The `cards` variant suits plan or style picking.
 *
 * @example
 * <RadioGroup value={plan} onChange={setPlan} variant="cards" options={[
 *   { value: 'starter', label: 'Starter', description: 'One shop, Telegram orders only' },
 *   { value: 'growth', label: 'Growth', description: 'Three channels and weekly reports' },
 * ]} />
 */
export function RadioGroup<V extends string | number>({ value, onChange, options, variant = 'list', label }: {
  value: V | undefined
  onChange: (value: V) => void
  /** `{ value, label, description }` entries. */
  options: OptionInput<V>[]
  variant?: 'list' | 'cards'
  label?: string
}) {
  return (
    <div className="ui-field">
      {label && <span className="ui-label">{label}</span>}
      <div className={cx('ui-radios', variant === 'cards' && 'cards')} role="radiogroup" aria-label={label || 'Options'}>
        {options.map(normOption).map((o, i) => (
          <button key={i} type="button" role="radio" aria-checked={o.value === value} className="ui-radio" onClick={() => onChange(o.value)}>
            <span className="dot" />
            <span>
              <b>{o.label}</b>
              {o.description && <small>{o.description}</small>}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
