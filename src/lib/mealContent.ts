export interface MealComponentEntry {
  name: string
  percent: number
}

/** Inversa de la serializacion del backend: "ARROZ:40;POLLO:60" -> [...]. */
export function parseMealContent(raw: string | null): MealComponentEntry[] {
  if (!raw) return []
  return raw
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [name, percent] = chunk.split(':')
      return { name: name ?? '', percent: Number(percent) || 0 }
    })
}
