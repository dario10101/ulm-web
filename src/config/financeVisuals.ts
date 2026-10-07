/**
 * Traduccion de los `icon_key`/`color_key` que vienen de la API (ver
 * app/db/models/finance.py) a componentes/clases concretas del frontend.
 *
 * Las categorias, metodos de pago y tags son datos (tabla en la base): agregar
 * o renombrar uno es un INSERT, no un deploy. Pero el icono y el color siguen
 * siendo un recurso del frontend, asi que la base solo guarda una llave
 * (ej. "shopping-cart", "amber") y estos diccionarios la resuelven. Si llega
 * una llave que todavia no esta aca, se usa el fallback neutro en vez de
 * romper: agregar un icono/color nuevo si requiere tocar este archivo (y
 * desde ese momento aparece en los selectores de Settings).
 */

import {
  Apple,
  Armchair,
  ArrowRightLeft,
  CircleHelp,
  Baby,
  Banknote,
  Bed,
  Beer,
  Bike,
  Bitcoin,
  BookOpen,
  Briefcase,
  Building,
  Bus,
  BusFront,
  Cake,
  Car,
  CarTaxiFront,
  Carrot,
  Cat,
  ChartLine,
  Church,
  Coffee,
  Coins,
  CreditCard,
  Dog,
  Droplet,
  Dumbbell,
  Film,
  Flower2,
  Fuel,
  Gamepad2,
  Gift,
  Glasses,
  GraduationCap,
  Hammer,
  HandCoins,
  HandHeart,
  HeartPulse,
  Hotel,
  House,
  IceCreamCone,
  Key,
  Landmark,
  Laptop,
  Lightbulb,
  Monitor,
  Mountain,
  Music,
  Package,
  Paintbrush,
  Palette,
  PawPrint,
  Phone,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Plug,
  Popcorn,
  Receipt,
  Sandwich,
  Scissors,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Sofa,
  Sparkles,
  Stethoscope,
  Store,
  Tent,
  Ticket,
  TrainFront,
  TreePine,
  TrendingUp,
  Tv,
  Umbrella,
  Users,
  Utensils,
  Wallet,
  Wifi,
  Wine,
  Wrench,
  Zap,
} from '@lucide/vue'
import type { Component } from 'vue'

const FINANCE_ICONS: Record<string, Component> = {
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  bus: Bus,
  fuel: Fuel,
  house: House,
  zap: Zap,
  droplet: Droplet,
  wifi: Wifi,
  'credit-card': CreditCard,
  'heart-pulse': HeartPulse,
  'shield-check': ShieldCheck,
  'graduation-cap': GraduationCap,
  sparkles: Sparkles,
  shirt: Shirt,
  wrench: Wrench,
  popcorn: Popcorn,
  plane: Plane,
  gift: Gift,
  'hand-coins': HandCoins,
  'paw-print': PawPrint,
  landmark: Landmark,
  package: Package,
  banknote: Banknote,
  'arrow-right-left': ArrowRightLeft,
  apple: Apple,
  armchair: Armchair,
  baby: Baby,
  bed: Bed,
  beer: Beer,
  bike: Bike,
  bitcoin: Bitcoin,
  'book-open': BookOpen,
  briefcase: Briefcase,
  building: Building,
  'bus-front': BusFront,
  cake: Cake,
  car: Car,
  'car-taxi-front': CarTaxiFront,
  carrot: Carrot,
  cat: Cat,
  'chart-line': ChartLine,
  church: Church,
  coffee: Coffee,
  coins: Coins,
  dog: Dog,
  dumbbell: Dumbbell,
  film: Film,
  'flower-2': Flower2,
  'gamepad-2': Gamepad2,
  glasses: Glasses,
  hammer: Hammer,
  'hand-heart': HandHeart,
  hotel: Hotel,
  'ice-cream-cone': IceCreamCone,
  key: Key,
  laptop: Laptop,
  lightbulb: Lightbulb,
  monitor: Monitor,
  mountain: Mountain,
  music: Music,
  paintbrush: Paintbrush,
  palette: Palette,
  phone: Phone,
  'piggy-bank': PiggyBank,
  pill: Pill,
  pizza: Pizza,
  plug: Plug,
  receipt: Receipt,
  sandwich: Sandwich,
  scissors: Scissors,
  'shopping-bag': ShoppingBag,
  'shopping-basket': ShoppingBasket,
  smartphone: Smartphone,
  sofa: Sofa,
  stethoscope: Stethoscope,
  store: Store,
  tent: Tent,
  ticket: Ticket,
  'train-front': TrainFront,
  'tree-pine': TreePine,
  'trending-up': TrendingUp,
  tv: Tv,
  umbrella: Umbrella,
  wallet: Wallet,
  wine: Wine,
  users: Users,
  'circle-help': CircleHelp,
}

/** Icono generico si `icon_key` no calza con nada conocido (nunca deberia
 * pasar con datos sembrados por el backend, pero evita romper el render). */
const FALLBACK_ICON = Package

/** Iconos que se pueden elegir como "logo" de una categoria o metodo de pago. */
export const FINANCE_ICON_KEYS: readonly string[] = Object.keys(FINANCE_ICONS)

export function financeIcon(iconKey: string): Component {
  return FINANCE_ICONS[iconKey] ?? FALLBACK_ICON
}

export interface FinanceColorClasses {
  bg: string
  text: string
  border: string
}

// Paleta chica y fija de colores default de Tailwind (el proyecto solo hace
// `extend` en tailwind.config.js, asi que estos siguen disponibles). Clases
// literales (no interpolacion de string) para que el JIT de Tailwind las vea.
// El texto usa -600 en claro y -400 en oscuro (contraste sobre cada fondo).
const FINANCE_COLOR_CLASSES: Record<string, FinanceColorClasses> = {
  rose: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
  },
  red: { bg: 'bg-red-500/15', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30' },
  orange: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/30',
  },
  amber: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
  },
  yellow: {
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-500/30',
  },
  lime: {
    bg: 'bg-lime-500/15',
    text: 'text-lime-600 dark:text-lime-400',
    border: 'border-lime-500/30',
  },
  green: {
    bg: 'bg-green-500/15',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/30',
  },
  emerald: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  teal: {
    bg: 'bg-teal-500/15',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-500/30',
  },
  cyan: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/30',
  },
  sky: { bg: 'bg-sky-500/15', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/30' },
  blue: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
  },
  indigo: {
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/30',
  },
  violet: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/30',
  },
  purple: {
    bg: 'bg-purple-500/15',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
  },
  fuchsia: {
    bg: 'bg-fuchsia-500/15',
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    border: 'border-fuchsia-500/30',
  },
  pink: {
    bg: 'bg-pink-500/15',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-500/30',
  },
  slate: {
    bg: 'bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
  },
}

const FALLBACK_COLOR_CLASSES: FinanceColorClasses = {
  bg: 'bg-surface-hover',
  text: 'text-muted',
  border: 'border-subtle',
}

/** Colores que se pueden elegir para tags, categorias y metodos de pago. */
export const FINANCE_COLOR_KEYS: readonly string[] = Object.keys(FINANCE_COLOR_CLASSES)

export function financeColorClasses(colorKey: string): FinanceColorClasses {
  return FINANCE_COLOR_CLASSES[colorKey] ?? FALLBACK_COLOR_CLASSES
}
