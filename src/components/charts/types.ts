import type { Component } from 'vue'

/**
 * Item generico de los graficos de categorias (dona, barras, columnas).
 * El color va como clase `text-*` de Tailwind y se dibuja con currentColor:
 * asi se reutilizan tal cual las clases de financeColorClasses().
 */
export interface ChartItem {
  key: string
  label: string
  value: number
  colorClass?: string
  icon?: Component
  /** Texto secundario (ej. "12 expenses"). */
  meta?: string
}

export type ValueFormatter = (value: number) => string

/** Paleta de respaldo para datos sin color propio (borradores, periodos). */
export const FALLBACK_CHART_COLORS = [
  'text-sky-400',
  'text-amber-400',
  'text-emerald-400',
  'text-violet-400',
  'text-rose-400',
  'text-teal-400',
  'text-orange-400',
  'text-indigo-400',
]

/** "Nice numbers" para ejes: redondea el paso a 1/2/5 * 10^n. */
export function niceStep(roughStep: number): number {
  if (roughStep <= 0) return 1
  const exponent = Math.floor(Math.log10(roughStep))
  const fraction = roughStep / 10 ** exponent
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * 10 ** exponent
}
