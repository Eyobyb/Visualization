import { useId, useState } from 'react'
import { Minus, Plus, Star } from 'lucide-react'
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

const decimals = (step: number) => (String(step).split('.')[1] ?? '').length

/**
 * An exact number with minus and plus buttons, for counts and amounts a slider makes fiddly.
 * Typed values are clamped to `min` and `max` when the field loses focus.
 *
 * @example <NumberInput value={guests} onChange={setGuests} min={1} max={40} label="Guests" />
 */
export function NumberInput({ value, onChange, min, max, step = 1, label, format, prefix, suffix }: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  /** Shows the value formatted under the field, such as currency. */
  format?: NumberFormat
  prefix?: string
  suffix?: string
}) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const val = num(value)
  const clamp = (n: number) =>
    Number(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)).toFixed(decimals(step)))
  const inRange = (n: number) => (min === undefined || n >= min) && (max === undefined || n <= max)
  return (
    <div className="ui-field">
      {label && <label className="ui-label" htmlFor={id}>{label}</label>}
      <div className="ui-inputwrap ui-stepper">
        <button type="button" aria-label="Decrease" disabled={min !== undefined && val <= min} onClick={() => onChange(clamp(val - step))}>
          <Minus size={15} />
        </button>
        {prefix && <span className="ui-affix">{prefix}</span>}
        <input
          id={id}
          className="ui-input"
          type="number"
          inputMode="decimal"
          value={draft ?? String(val)}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            setDraft(e.target.value)
            const n = e.target.value === '' ? NaN : +e.target.value
            if (Number.isFinite(n) && inRange(n)) onChange(n)
          }}
          onBlur={() => {
            const n = draft === null || draft === '' ? val : +draft
            if (Number.isFinite(n)) onChange(clamp(n))
            setDraft(null)
          }}
        />
        {suffix && <span className="ui-affix">{suffix}</span>}
        <button type="button" aria-label="Increase" disabled={max !== undefined && val >= max} onClick={() => onChange(clamp(val + step))}>
          <Plus size={15} />
        </button>
      </div>
      {format && <span className="ui-num-hint">{fmt(val, format)}</span>}
    </div>
  )
}

/**
 * Picks a date, or a date range when `onEndChange` is given. Dates are ISO `YYYY-MM-DD` strings.
 * Moving the start past the end moves the end with it.
 *
 * @example <DatePicker value={from} onChange={setFrom} end={to} onEndChange={setTo} label="Trip dates" />
 */
export function DatePicker({ value, onChange, end, onEndChange, label, min, max }: {
  value: string | undefined
  onChange: (value: string) => void
  /** End of the range. */
  end?: string
  onEndChange?: (value: string) => void
  label?: string
  /** Earliest selectable date, `YYYY-MM-DD`. */
  min?: string
  /** Latest selectable date, `YYYY-MM-DD`. */
  max?: string
}) {
  const id = useId()
  const range = !!onEndChange
  return (
    <div className="ui-field">
      {label && <label className="ui-label" htmlFor={id}>{label}</label>}
      <div className="ui-daterow">
        <div className="ui-inputwrap">
          <input
            id={id}
            className="ui-input"
            type="date"
            aria-label={range ? 'Start date' : undefined}
            value={value ?? ''}
            min={min}
            max={max}
            onChange={(e) => {
              onChange(e.target.value)
              if (range && end && e.target.value > end) onEndChange(e.target.value)
            }}
          />
        </div>
        {range && (
          <>
            <span className="ui-daterow-to">to</span>
            <div className="ui-inputwrap">
              <input
                className="ui-input"
                type="date"
                aria-label="End date"
                value={end ?? ''}
                min={value || min}
                max={max}
                onChange={(e) => onEndChange(e.target.value)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Stars({ value, max, size }: { value: number; max: number; size: number }) {
  return (
    <>
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.min(1, Math.max(0, value - i))
        return (
          <span key={i} className="ui-star" style={{ width: size, height: size }}>
            <Star size={size} className="empty" />
            {fill > 0 && (
              <span className="full" style={{ width: fill * 100 + '%' }}>
                <Star size={size} fill="currentColor" />
              </span>
            )}
          </span>
        )
      })}
    </>
  )
}

/**
 * Stars out of `max`. With `onChange` the reader can click a rating; without it the score is display-only
 * and may be fractional, such as 4.6.
 *
 * @example <Rating value={4.6} label="Reviews" />
 */
export function Rating({ value, onChange, max = 5, label, size = 'md', showValue = true }: {
  value: number | undefined
  onChange?: (value: number) => void
  max?: number
  label?: string
  size?: 'sm' | 'md'
  /** Show the number next to the stars. */
  showValue?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const val = Math.min(max, Math.max(0, num(value)))
  const px = size === 'sm' ? 14 : 20
  const shown = showValue && <span className="ui-rating-val">{Number.isInteger(val) ? val : val.toFixed(1)}</span>
  const body = onChange ? (
    <div className="ui-rating" role="radiogroup" aria-label={label || 'Rating'} onMouseLeave={() => setHover(null)}>
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={Math.round(val) === i + 1}
          aria-label={`${i + 1} of ${max}`}
          className="ui-star-btn"
          onMouseEnter={() => setHover(i + 1)}
          onClick={() => onChange(i + 1)}
        >
          <Stars value={(hover ?? val) > i ? 1 : 0} max={1} size={px} />
        </button>
      ))}
      {shown}
    </div>
  ) : (
    <div className={cx('ui-rating', 's-' + size)} role="img" aria-label={`Rated ${val} out of ${max}`}>
      <Stars value={val} max={max} size={px} />
      {shown}
    </div>
  )
  if (!label) return body
  return (
    <div className="ui-field">
      <span className="ui-label">{label}</span>
      {body}
    </div>
  )
}
