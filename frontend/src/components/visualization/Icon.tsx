import { ICONS, isIconName, type IconName } from './icons'

export type { IconName }

/**
 * Low-level outline icon used inside other components. Renders nothing for unknown names.
 *
 * @example <Glyph name="truck" size={16} />
 */
export function Glyph({ name, size = 18 }: { name: IconName | undefined; size?: number }) {
  if (!isIconName(name)) return null
  const Svg = ICONS[name]
  return <Svg className="ui-icon" size={size} strokeWidth={2} aria-hidden />
}
