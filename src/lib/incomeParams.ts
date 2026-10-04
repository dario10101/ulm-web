import type { IncomeCatalogType } from '@/types/income'

/** Opciones del tipo de una fuente de ingreso, con lo que significa cada una. */
export const INCOME_TYPE_OPTIONS: { value: IncomeCatalogType; label: string; hint: string }[] = [
  { value: 'DIRECT', label: 'Direct income', hint: 'Money received on a date: salary, a sale.' },
  {
    value: 'INTEREST',
    label: 'Interest',
    hint: 'Monthly yield of a savings or investment product.',
  },
  { value: 'ALL', label: 'Both', hint: 'Offered in both income forms.' },
]

export function incomeTypeLabel(type: IncomeCatalogType): string {
  return INCOME_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type
}
