import type { Category, CategoryWrite } from '@/types/checklist'

/**
 * Espejo en el front de la regla del backend: el nombre de una categoria es
 * unico por usuario, sin distinguir mayusculas y contando tambien las
 * DISABLED (dos "Salud" con historia saldrian por separado en analytics).
 *
 * El backend lo valida igual; esto solo evita el viaje de ida y vuelta y da un
 * mensaje mas directo. Devuelve el problema a mostrar, o null si no hay.
 *
 * `disabled` son las ya deshabilitadas; `removed`, las que este mismo guardado
 * deshabilita (estaban y ya no vienen en `items`): conservan su nombre.
 */
export function categoryNameProblem(
  items: CategoryWrite[],
  disabled: Category[],
  removed: Category[],
): string | null {
  const seen = new Set<string>()
  for (const item of items) {
    const key = item.name.toLowerCase()
    if (seen.has(key)) return `"${item.name}" appears more than once.`
    seen.add(key)
  }

  const inactive = new Map([...disabled, ...removed].map((c) => [c.name.toLowerCase(), c]))
  for (const item of items) {
    const taken = inactive.get(item.name.toLowerCase())
    if (!taken) continue
    return taken.status === 'DISABLED'
      ? `"${item.name}" is already used by a disabled category. Re-enable it instead.`
      : `"${item.name}" belongs to a category you're removing. Keep it instead of adding a new one.`
  }
  return null
}
