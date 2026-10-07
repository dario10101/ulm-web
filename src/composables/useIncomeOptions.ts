import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'

import { getIncomeOptions } from '@/services/incomesApi'
import type { ExpenseTagOption } from '@/types/expense'
import type {
  IncomeCatalogType,
  IncomeKind,
  IncomeSourceOption,
  IncomeSubcategoryOption,
  InterestEndBalance,
} from '@/types/income'

/**
 * Catalogos de ingresos (fuentes, subcategorias, tags y saldos finales de
 * intereses) en un solo request, compartidos por los forms directo/intereses,
 * sus dialogos de edicion y "View records". Mismo patron que
 * useExpenseOptions: estado a nivel de modulo, se pide una vez por carga de
 * la app; alternar Direct/Interest no vuelve a llamar a la API.
 */
const sources = ref<IncomeSourceOption[]>([])
const subcategories = ref<IncomeSubcategoryOption[]>([])
const tags = ref<ExpenseTagOption[]>([])
const endBalances = ref<InterestEndBalance[]>([])
const loadError = ref(false)
let loaded = false
let inFlight: Promise<void> | null = null

function appliesTo(type: IncomeCatalogType, kind: IncomeKind): boolean {
  return type === 'ALL' || type === kind.toUpperCase()
}

/**
 * Las fuentes que aplican al tipo, primero las especificas y luego las ALL
 * (orden estable dentro de cada grupo).
 */
function forKind<T extends { type: IncomeCatalogType }>(items: T[], kind: IncomeKind): T[] {
  const applicable = items.filter((item) => appliesTo(item.type, kind))
  return [
    ...applicable.filter((item) => item.type !== 'ALL'),
    ...applicable.filter((item) => item.type === 'ALL'),
  ]
}

export interface BalanceKey {
  sourceId: number
  subcategoryId: number
  /** "YYYY-MM" */
  period: string
}

/** Clave del saldo de un registro de intereses ya guardado. */
export function balanceKeyOf(record: {
  source: { id: number }
  subcategory: { id: number }
  recorded_on: string
}): BalanceKey {
  return {
    sourceId: record.source.id,
    subcategoryId: record.subcategory.id,
    period: record.recorded_on.slice(0, 7),
  }
}

export function periodKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

export function useIncomeOptions() {
  async function ensureLoaded(): Promise<void> {
    if (loaded) return
    if (inFlight) return inFlight

    loadError.value = false
    inFlight = getIncomeOptions()
      .then((result) => {
        sources.value = result.sources
        subcategories.value = result.subcategories
        tags.value = result.tags
        endBalances.value = result.interest_end_balances
        loaded = true
      })
      .catch(() => {
        // Quien llama decide como mostrarlo; se permite reintentar.
        loadError.value = true
      })
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }

  /** Tras editar fuentes/subcategorias/tags: la proxima carga vuelve a pedirlas. */
  function invalidate(): void {
    loaded = false
  }

  // Aceptan un kind reactivo (ej. la barra de filtros, que cambia de tipo).
  function sourcesFor(kind: MaybeRefOrGetter<IncomeKind>) {
    return computed(() => forKind(sources.value, toValue(kind)))
  }

  /** Subcategorias de una fuente (cada una pertenece a una sola). Vacio sin fuente. */
  function subcategoriesOf(sourceId: MaybeRefOrGetter<number | null>) {
    return computed(() => {
      const id = toValue(sourceId)
      return id === null ? [] : subcategories.value.filter((s) => s.source_id === id)
    })
  }

  /** Subcategorias de todas las fuentes que aplican al tipo (ej. filtros sin fuente elegida). */
  function subcategoriesFor(kind: MaybeRefOrGetter<IncomeKind>) {
    return computed(() => {
      const sourceIds = new Set(forKind(sources.value, toValue(kind)).map((s) => s.id))
      return subcategories.value.filter((s) => sourceIds.has(s.source_id))
    })
  }

  function sourceName(sourceId: number): string {
    return sources.value.find((s) => s.id === sourceId)?.name ?? ''
  }

  // Clave del saldo: fuente + subcategoria (cada una es un producto con su
  // propio saldo, ej. Tyba "MI CARRO" vs "MI RETIRO") + periodo.
  function sameBalance(b: InterestEndBalance, key: BalanceKey): boolean {
    return (
      b.source_id === key.sourceId &&
      b.subcategory_id === key.subcategoryId &&
      b.period === key.period
    )
  }

  function endBalanceOf(key: BalanceKey): number | null {
    return endBalances.value.find((b) => sameBalance(b, key))?.end_of_month_amount ?? null
  }

  /**
   * Mantiene el cache al dia tras guardar/editar/borrar un mes de intereses,
   * sin volver a pedir las opciones. `endAmount` null quita el saldo del periodo.
   */
  function setEndBalance(key: BalanceKey, endAmount: number | null): void {
    const rest = endBalances.value.filter((b) => !sameBalance(b, key))
    endBalances.value =
      endAmount === null
        ? rest
        : [
            ...rest,
            {
              source_id: key.sourceId,
              subcategory_id: key.subcategoryId,
              period: key.period,
              end_of_month_amount: endAmount,
            },
          ]
  }

  return {
    sources,
    subcategories,
    tags,
    loadError,
    ensureLoaded,
    invalidate,
    sourcesFor,
    subcategoriesOf,
    subcategoriesFor,
    sourceName,
    endBalanceOf,
    setEndBalance,
  }
}
