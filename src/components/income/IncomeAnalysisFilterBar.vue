<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed } from 'vue'

import DateFilterControls from '@/components/finance/DateFilterControls.vue'
import MultiSelectMenu, { type MultiSelectOption } from '@/components/finance/MultiSelectMenu.vue'
import TagFilterMenu from '@/components/finance/TagFilterMenu.vue'
import { useIncomeOptions } from '@/composables/useIncomeOptions'
import {
  patchIncomeAnalysisFilters,
  type IncomeAnalysisFilters,
  type IncomeAnalysisView,
  type IncomeKindFilter,
} from '@/lib/incomeAnalysisFilters'
import { sourceColor, subcategoryColor } from '@/lib/incomeColors'

// Barra de filtros de "Finance analysis -> Income". Reglas (ver
// incomeAnalysisFilters.ts): subcategorias solo con una unica fuente; en la
// vista por subcategoria la fuente es de seleccion unica y obligatoria; en
// la vista por mes la fecha es un solo año.
const props = defineProps<{ view: IncomeAnalysisView }>()
const model = defineModel<IncomeAnalysisFilters>({ required: true })

const { sources, subcategories, tags, sourcesFor, subcategoriesOf } = useIncomeOptions()
const directSources = sourcesFor('direct')
const interestSources = sourcesFor('interest')

const availableSources = computed(() => {
  if (model.value.kind === 'direct') return directSources.value
  if (model.value.kind === 'interest') return interestSources.value
  return [...sources.value].sort((a, b) => a.id - b.id)
})

const sourceOptions = computed<MultiSelectOption[]>(() =>
  availableSources.value.map((s) => ({
    id: s.id,
    label: s.name,
    colorClass: sourceColor(sources.value, s.id),
  })),
)

const singleSourceId = computed(() =>
  model.value.sourceIds.length === 1 ? model.value.sourceIds[0] : null,
)
const subcategoryOptions = computed<MultiSelectOption[]>(() =>
  subcategoriesOf(singleSourceId).value.map((s) => ({
    id: s.id,
    label: s.name,
    colorClass: subcategoryColor(subcategories.value, s.id),
  })),
)

function update(patch: Partial<IncomeAnalysisFilters>) {
  const next = { ...patch }
  // Al acotar el tipo, las fuentes elegidas que no aplican dejarian el
  // filtro vacio sin que se note: se quitan.
  if (patch.kind && patch.kind !== 'all') {
    const allowed = new Set(
      (patch.kind === 'direct' ? directSources.value : interestSources.value).map((s) => s.id),
    )
    const kept = model.value.sourceIds.filter((id) => allowed.has(id))
    // En la vista por subcategoria siempre debe quedar una fuente.
    next.sourceIds =
      props.view === 'subcategory' && !kept.length && allowed.size ? [[...allowed][0]] : kept
  }
  model.value = patchIncomeAnalysisFilters(model.value, next)
}

function field<K extends keyof IncomeAnalysisFilters>(key: K) {
  return computed<IncomeAnalysisFilters[K]>({
    get: () => model.value[key],
    set: (value) => update({ [key]: value } as Partial<IncomeAnalysisFilters>),
  })
}

const sourceIds = field('sourceIds')
const subcategoryIds = field('subcategoryIds')
const tagIds = field('tagIds')

const singleSource = computed<number | null>({
  get: () => singleSourceId.value,
  set: (id) => update({ sourceIds: id === null ? [] : [id] }),
})

const kinds: { id: IncomeKindFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'direct', label: 'Direct' },
  { id: 'interest', label: 'Interest' },
]

const hasExtraFilters = computed(
  () =>
    model.value.kind !== 'all' ||
    (props.view !== 'subcategory' && model.value.sourceIds.length > 0) ||
    model.value.subcategoryIds.length > 0 ||
    model.value.tagIds.length > 0,
)

function clearExtraFilters() {
  update({
    kind: 'all',
    // La vista por subcategoria necesita su fuente: se conserva.
    sourceIds: props.view === 'subcategory' ? model.value.sourceIds : [],
    subcategoryIds: [],
    tagIds: [],
  })
}

const CONTROL = 'h-8 rounded-lg border border-subtle bg-surface px-2 text-xs text-foreground'
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <DateFilterControls v-model="model" :single-year="view === 'month'" />

    <span class="mx-1 hidden h-5 w-px bg-subtle sm:block" />

    <div class="flex h-8 overflow-hidden rounded-lg border border-subtle text-xs">
      <button
        v-for="(option, index) in kinds"
        :key="option.id"
        type="button"
        :data-test="`kind-${option.id}`"
        class="px-2 font-medium transition-colors"
        :class="[
          index > 0 && 'border-l border-subtle',
          model.kind === option.id
            ? 'bg-accent/10 text-accent-text'
            : 'bg-surface text-muted hover:text-foreground',
        ]"
        @click="update({ kind: option.id })"
      >
        {{ option.label }}
      </button>
    </div>

    <!-- Por subcategoria: la fuente es de seleccion unica (el grafico es de una sola fuente). -->
    <select
      v-if="view === 'subcategory'"
      v-model="singleSource"
      aria-label="Source"
      data-test="single-source"
      :class="[CONTROL, 'max-w-44']"
    >
      <option v-for="source in availableSources" :key="source.id" :value="source.id">
        {{ source.name }}
      </option>
    </select>
    <MultiSelectMenu
      v-else
      v-model="sourceIds"
      :options="sourceOptions"
      all-label="All sources"
      noun="sources"
      data-test="sources"
    />

    <MultiSelectMenu
      v-model="subcategoryIds"
      :options="subcategoryOptions"
      all-label="All subcategories"
      noun="subcategories"
      :disabled="singleSourceId === null"
      disabled-reason="Pick exactly one source to filter by subcategory"
      data-test="subcategories"
    />

    <TagFilterMenu v-model="tagIds" :tags="tags" />

    <button
      v-if="hasExtraFilters"
      type="button"
      title="Clear type, source, subcategory and tag filters"
      class="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted hover:text-ruby-text"
      @click="clearExtraFilters"
    >
      <X class="h-3.5 w-3.5" />
      Clear
    </button>
  </div>
</template>
