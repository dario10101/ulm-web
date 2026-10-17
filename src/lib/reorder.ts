/**
 * Copia de `list` con el elemento de `index` movido `delta` lugares (-1 sube,
 * +1 baja). Fuera de rango, la lista queda igual: las flechas de los extremos
 * no hacen nada en vez de romper.
 */
export function move<T>(list: readonly T[], index: number, delta: number): T[] {
  const target = index + delta
  const copy = [...list]
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return copy
  const [item] = copy.splice(index, 1)
  copy.splice(target, 0, item)
  return copy
}
