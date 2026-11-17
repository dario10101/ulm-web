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

// Patron del filtro de Excel: sin nada elegido (sin filtro) todo se ve marcado.
// Desde ahi, desmarcar una opcion deja "todas menos esa" y "Only" deja solo
// una: cada caso en un clic. Elegir todas a mano vuelve a [] (sin filtro), para
// que una opcion nueva entre sola y un registro sin valor no quede afuera.
// Nunca queda nada marcado: un filtro vacio no devolveria nada.
const isAll = computed(() => selected.value.length === 0)

function isChecked(id: number): boolean {
  return isAll.value || selected.value.includes(id)
}

/** Unica opcion marcada: no se puede desmarcar (ver arriba). */
function isLastChecked(id: number): boolean {
  if (isAll.value) return props.options.length === 1
  return selected.value.length === 1 && selected.value[0] === id
}

const summary = computed(() => {
  if (isAll.value) return props.allLabel
  if (selected.value.length === 1) {
    return props.options.find((o) => o.id === selected.value[0])?.label ?? `1 ${props.noun}`
  }
  return `${selected.value.length} ${props.noun}`
})

/** Normaliza: todas las opciones elegidas es lo mismo que sin filtro. */
function setSelection(ids: number[]) {
  const coversAll = props.options.every((option) => ids.includes(option.id))
  selected.value = coversAll ? [] : ids
}

function toggle(id: number) {
  if (isLastChecked(id)) return
  if (isAll.value) {
    setSelection(props.options.map((option) => option.id).filter((value) => value !== id))
  } else if (selected.value.includes(id)) {
    setSelection(selected.value.filter((value) => value !== id))
  } else {
    setSelection([...selected.value, id])
  }
}

function only(id: number) {
  setSelection([id])
}
</script>

<template>
  <details class="relative" :class="disabled && 'pointer-events-none opacity-40'">
    <summary
      class="flex h-8 max-w-48 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-subtle bg-surface px-2 text-xs hover:text-foreground [&::-webkit-details-marker]:hidden"
      :class="isAll ? 'text-muted' : 'text-accent-text'"
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
      <template v-else>
        <!-- "All" vuelve a sin filtro; ya marcado no hace nada (desmarcarlo
             dejaria el filtro vacio). -->
        <button
          type="button"
          data-test="option-all"
          class="mb-1 flex w-full items-center gap-2 rounded-md border-b border-subtle px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-surface-hover"
          :class="isAll ? 'cursor-default text-foreground' : 'text-muted'"
          :aria-pressed="isAll"
          @click="selected = []"
        >
          <span
            class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border"
            :class="isAll ? 'border-accent-text bg-accent/30' : 'border-subtle'"
          >
            <Check v-if="isAll" class="h-3 w-3 text-accent-text" />
          </span>
          All
        </button>
        <div
          v-for="option in options"
          :key="option.id"
          class="group flex items-center rounded-md transition-colors hover:bg-surface-hover"
        >
          <button
            type="button"
            :data-test="`option-${option.id}`"
            class="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-xs"
            :class="[
              isChecked(option.id) ? 'text-foreground' : 'text-muted',
              isLastChecked(option.id) && 'cursor-default',
            ]"
            :aria-pressed="isChecked(option.id)"
            :title="isLastChecked(option.id) ? 'At least one must stay selected' : undefined"
            @click="toggle(option.id)"
          >
            <span
              class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border"
              :class="isChecked(option.id) ? 'border-accent-text bg-accent/30' : 'border-subtle'"
            >
              <Check v-if="isChecked(option.id)" class="h-3 w-3 text-accent-text" />
            </span>
            <span
              v-if="option.colorClass"
              class="h-2 w-2 shrink-0 rounded-full bg-current"
              :class="option.colorClass"
            />
            <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
            <span v-if="option.hint" class="shrink-0 text-[10px] text-muted">{{
              option.hint
            }}</span>
          </button>
          <!-- Solo con el mouse encima (o con foco); en pantallas tactiles,
               sin hover, siempre visible. -->
          <button
            v-if="options.length > 1 && !(selected.length === 1 && selected[0] === option.id)"
            type="button"
            :data-test="`only-${option.id}`"
            class="shrink-0 rounded px-1.5 py-1 text-[10px] font-medium text-accent-text opacity-0 hover:underline focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
            :aria-label="`Only ${option.label}`"
            @click="only(option.id)"
          >
            Only
          </button>
        </div>
      </template>
    </div>
  </details>
</template>
