<script setup lang="ts">
import { formatAmountInput } from '@/lib/currency'

// Input de monto en COP con formato al escribir ("." de miles, "," decimal;
// mismo formato que "New expense"). El v-model es el texto formateado
// ("1.250.000,50"); se convierte a numero con parseAmountInput al enviar.
// El ancho lo decide quien lo usa (class="w-32", etc.).
const props = withDefaults(
  defineProps<{
    placeholder?: string
    readonly?: boolean
    // Solo para montos que pueden ser perdidas (ej. interes de un mes malo).
    allowNegative?: boolean
  }>(),
  { placeholder: '0', readonly: false, allowNegative: false },
)

const model = defineModel<string>({ required: true })

function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  model.value = formatAmountInput(input.value, props.allowNegative)
  // Si el texto formateado coincide con el valor previo, Vue no re-renderiza
  // y quedaria en pantalla el caracter invalido que se acaba de escribir.
  input.value = model.value
}
</script>

<template>
  <div
    class="flex items-center gap-1 rounded-lg border border-subtle px-2 py-1.5 text-sm"
    :class="readonly ? 'bg-surface-hover/60' : 'bg-surface focus-within:border-accent-text/50'"
  >
    <span class="text-muted">$</span>
    <input
      :value="model"
      type="text"
      :inputmode="allowNegative ? 'text' : 'decimal'"
      :placeholder="placeholder"
      :readonly="readonly"
      :tabindex="readonly ? -1 : undefined"
      class="w-full min-w-0 bg-transparent tabular-nums outline-none"
      :class="readonly && 'cursor-default'"
      @input="onInput"
    />
  </div>
</template>
