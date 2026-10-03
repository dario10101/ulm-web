import { FALLBACK_CHART_COLORS } from '@/components/charts/types'
import type { IncomeSourceOption, IncomeSubcategoryOption } from '@/types/income'

/**
 * Fuentes y subcategorias no tienen color en la base (a diferencia de tags y
 * categorias de gasto): se les asigna uno de la paleta de respaldo por su
 * posicion estable (orden de id), no por el orden del grafico. Asi una fuente
 * conserva su color en todas las vistas y filtros, aunque cambie su ranking.
 */
function colorAt(index: number): string {
  return index < 0 ? 'text-slate-400' : FALLBACK_CHART_COLORS[index % FALLBACK_CHART_COLORS.length]
}

export function sourceColor(sources: IncomeSourceOption[], sourceId: number): string {
  const ordered = [...sources].sort((a, b) => a.id - b.id)
  return colorAt(ordered.findIndex((s) => s.id === sourceId))
}

/** Posicion dentro de su fuente: las subcategorias de una fuente no repiten color. */
export function subcategoryColor(
  subcategories: IncomeSubcategoryOption[],
  subcategoryId: number,
): string {
  const subcategory = subcategories.find((s) => s.id === subcategoryId)
  if (!subcategory) return colorAt(-1)
  const siblings = subcategories
    .filter((s) => s.source_id === subcategory.source_id)
    .sort((a, b) => a.id - b.id)
  return colorAt(siblings.findIndex((s) => s.id === subcategoryId))
}
