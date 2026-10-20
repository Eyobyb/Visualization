import {
  ArrowRight, Calendar, ChartColumn, Check, ChevronDown, Clock, Coffee, Copy, ExternalLink, Info, Layers, MapPin,
  Package, Pause, Play, RefreshCw, RotateCcw, Search, Send, ShoppingBag, SkipForward, Star, TrendingDown, TrendingUp,
  TriangleAlert, Truck, Users, Wallet, X, Zap, type LucideIcon,
} from 'lucide-react'

/** The icon set available to generated UI, keyed by the names the model writes. */
export const ICONS = {
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'arrow-right': ArrowRight,
  check: Check,
  x: X,
  info: Info,
  'alert-triangle': TriangleAlert,
  copy: Copy,
  'map-pin': MapPin,
  users: Users,
  wallet: Wallet,
  package: Package,
  calendar: Calendar,
  clock: Clock,
  refresh: RefreshCw,
  truck: Truck,
  'shopping-bag': ShoppingBag,
  star: Star,
  chart: ChartColumn,
  search: Search,
  send: Send,
  coffee: Coffee,
  zap: Zap,
  layers: Layers,
  play: Play,
  pause: Pause,
  skip: SkipForward,
  'rotate-ccw': RotateCcw,
  'chevron-down': ChevronDown,
  external: ExternalLink,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS

/** True when `name` is one of the registered icon names. */
export function isIconName(name: unknown): name is IconName {
  return typeof name === 'string' && Object.hasOwn(ICONS, name)
}
