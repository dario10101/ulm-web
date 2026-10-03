<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue'
import { computed } from 'vue'

export interface MultiSelectOption {
  id: number
  label: string
  /** Texto secundario (ej. la fuente de una subcategoria). */
  hint?: string
  /** Clase `text-*` para el punto de color (ej. el color del grafico). */
  colorClass?: string
}

// Filtro multi-seleccion de las barras de finanzas (categorias, metodos de
// pago, fuentes, subcategorias): desplegable con checks para no ocupar una
// fila entera. Sin nada elegido equivale a "todos".
const props = withDefaults(
  defineProps<{
    options: MultiSelectOption[]
    /** Texto con nada elegido (ej. "All categories"). */
    allLabel: string
    /** Plural para el resumen (ej. "categories" -> "3 categories"). */
    noun: string
    disabled?: boolean
    /** Explica por que esta deshabilitado (tooltip). */
    disabledReason?: string
  }>(),
  { disabled: false, disabledReason: undefined },
)

const selected = defineModel<number[]>({ required: true })

const summary = computed(() => {
  if (!selected.value.length) return props.allLabel
  if (selected.value.length === 1) {
    return props.options.find((o) => o.id === selected.value[0])?.label ?? `1 ${props.noun}`
  }
  return `${selected.value.length} ${props.noun}`
})

function toggle(id: number) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((value) => value !== id)
    : [...selected.value, id]
}
</script>

<template>
  <details class="relative" :class="disabled && 'pointer-events-none opacity-40'">
    <summary
      class="flex h-8 max-w-48 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-subtle bg-surface px-2 text-xs hover:text-foreground [&::-webkit-details-marker]:hidden"
      :class="selected.length ? 'text-accent-text' : 'text-muted'"
      :title="disabled ? disabledReason : summary"
      :aria-disabled="disabled"
    >
      <span class="truncate">{{ summary }}</span>
      <ChevronDown class="h-3.5 w-3.5 shrink-0" />
    </summary>
    <div
      class="absolute z-20 mt-1 max-h-72 w-max min-w-44 max-w-72 overflow-y-auto rounded-lg border border-subtle bg-surface p-1 shadow-lg"
    >
      <p v-if="!options.length" class="px-2 py-1.5 text-xs text-muted">Nothing to pick yet.</p>
      <button
        v-for="option in options"
        :key="option.id"
        type="button"
        :data-test="`option-${option.id}`"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-surface-hover"
        :class="selected.includes(option.id) ? 'text-foreground' : 'text-muted'"
        @click="toggle(option.id)"
      >
        <span
          class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border"
          :class="
            selected.includes(option.id) ? 'border-accent-text bg-accent/30' : 'border-subtle'
          "
        >
          <Check v-if="selected.includes(option.id)" class="h-3 w-3 text-accent-text" />
        </span>
        <span
          v-if="option.colorClass"
          class="h-2 w-2 shrink-0 rounded-full bg-current"
          :class="option.colorClass"
        />
        <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
        <span v-if="option.hint" class="shrink-0 text-[10px] text-muted">{{ option.hint }}</span>
      </button>
      <button
        v-if="selected.length"
        type="button"
        class="mt-1 w-full border-t border-subtle px-2 pb-1 pt-1.5 text-left text-[11px] text-muted hover:text-ruby-text"
        @click="selected = []"
      >
        Clear selection
      </button>
    </div>
  </details>
</template>
