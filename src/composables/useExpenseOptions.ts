import { ref } from 'vue'

import { getExpenseOptions } from '@/services/expensesApi'
import type { CategoryOption, ExpenseTagOption, PaymentMethodOption } from '@/types/expense'

/**
 * Catalogos de gastos (categorias, metodos de pago, tags), compartidos por
 * "Add record" y "View records". Mismo patron que useCategories.ts: estado
 * fuera de la funcion, se pide una sola vez y se comparte entre vistas.
 */
const categories = ref<CategoryOption[]>([])
const paymentMethods = ref<PaymentMethodOption[]>([])
const tags = ref<ExpenseTagOption[]>([])
let loaded = false
let inFlight: Promise<void> | null = null

export function useExpenseOptions() {
  async function ensureLoaded(): Promise<void> {
    if (loaded) return
    if (inFlight) return inFlight

    inFlight = getExpenseOptions()
      .then((result) => {
        categories.value = result.categories
        paymentMethods.value = result.payment_methods
        tags.value = result.tags
        loaded = true
      })
      .catch(() => {
        // Quien llama muestra su propio error de carga; aca solo evitamos
        // dejar la promesa colgada y permitimos reintentar.
      })
      .finally(() => {
        inFlight = null
      })

    return inFlight
  }

  function invalidate(): void {
    loaded = false
  }

  return { categories, paymentMethods, tags, ensureLoaded, invalidate }
}
