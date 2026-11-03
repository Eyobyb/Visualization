/** Design px → rem (16px root). Use for styles, CSS vars, and chart sizes. */
export function rem(px: number): string {
  const n = px / 16
  const s = n.toFixed(6).replace(/\.?0+$/, '')
  return `${s}rem`
}
