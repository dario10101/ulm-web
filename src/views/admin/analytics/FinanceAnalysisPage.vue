<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  financeAnalysisTypes,
  type FinanceAnalysisType,
  type FinanceAnalysisView,
} from '@/config/financeAnalysisTypes'

const route = useRoute()
const router = useRouter()

// Sin tipo en la URL se muestra un selector a pantalla completa en vez de
// redirigir a una categoria por defecto: las consultas de cada analisis
// pueden ser pesadas, asi que ninguna se dispara hasta que el usuario elija.
const selectedType = computed<FinanceAnalysisType | null>(
  () => financeAnalysisTypes.find((type) => type.id === route.params.type) ?? null,
)

// Sub-analisis (segundo selector), solo para las areas que lo tienen. Aca si
// hay default (el primero): elegir el area ya es la decision del usuario.
const selectedView = computed<FinanceAnalysisView | null>(() => {
  const views = selectedType.value?.views
  if (!views?.length) return null
  return views.find((view) => view.id === route.params.view) ?? views[0]
})

// Corrige la URL cuando no calza: tipo invalido -> selector; vista faltante
// o invalida -> la vista por defecto; vista en un area sin vistas -> se quita.
watch(
  () => [route.params.type, route.params.view],
  ([type, view]) => {
    if (type && !selectedType.value) {
      router.replace({ name: 'admin-analytics-finance' })
      return
    }
    const expectedView = selectedView.value?.id
    if (selectedType.value && (view || undefined) !== expectedView) {
      router.replace({
        name: 'admin-analytics-finance',
        params: { type: selectedType.value.id, view: expectedView },
      })
    }
  },
  { immediate: true },
)

function onSelectType(event: Event) {
  const id = (event.target as HTMLSelectElement).value
  router.push({ name: 'admin-analytics-finance', params: { type: id } })
}

function onSelectView(event: Event) {
  const id = (event.target as HTMLSelectElement).value
  router.push({
    name: 'admin-analytics-finance',
    params: { type: selectedType.value!.id, view: id },
  })
}

const SELECT_CLASS = 'h-9 rounded-lg border border-subtle bg-surface px-3 text-sm text-foreground'
</script>

<template>
  <div class="space-y-6">
    <template v-if="selectedType">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <RouterLink
            :to="{ name: 'admin-analytics-finance' }"
            class="text-xs font-medium text-muted hover:text-foreground"
          >
            ← All analyses
          </RouterLink>
          <h1 class="mt-1 flex items-center gap-2 text-xl font-semibold text-foreground">
            <component :is="selectedType.icon" class="h-5 w-5 text-accent-text" />
            {{ selectedType.label }}
          </h1>
          <p class="text-sm text-muted">{{ selectedType.description }}</p>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <label class="text-sm">
            <span class="mb-1 block text-xs text-muted">Area</span>
            <select :value="selectedType.id" :class="SELECT_CLASS" @change="onSelectType">
              <option v-for="type in financeAnalysisTypes" :key="type.id" :value="type.id">
                {{ type.label }}
              </option>
            </select>
          </label>
          <label v-if="selectedType.views && selectedView" class="text-sm">
            <span class="mb-1 block text-xs text-muted">Analysis</span>
            <select :value="selectedView.id" :class="SELECT_CLASS" @change="onSelectView">
              <option v-for="view in selectedType.views" :key="view.id" :value="view.id">
                {{ view.label }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <!-- :key por area: cambiar de area monta de cero (estado y filtros propios). -->
      <component
        :is="selectedType.component"
        :key="selectedType.id"
        v-bind="selectedView ? { view: selectedView.id } : {}"
      />
    </template>

    <!-- Sin tipo elegido: selector a pantalla completa, nada de datos se pide todavia. -->
    <div v-else class="flex min-h-[70vh] flex-col justify-center gap-8">
      <div class="text-center">
        <h1 class="text-xl font-semibold text-foreground">Finance analysis</h1>
        <p class="mt-1 text-sm text-muted">Pick what you want to look at.</p>
      </div>

      <div class="mx-auto grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink
          v-for="type in financeAnalysisTypes"
          :key="type.id"
          :to="{ name: 'admin-analytics-finance', params: { type: type.id } }"
          class="relative flex flex-col gap-2 rounded-xl border border-subtle p-4 text-left transition-colors hover:border-accent-text/50 hover:bg-surface"
        >
          <span
            v-if="type.draft"
            class="absolute right-3 top-3 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400"
          >
            Draft
          </span>
          <span
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent-text"
          >
            <component :is="type.icon" class="h-5 w-5" />
          </span>
          <span class="text-sm font-semibold text-foreground">{{ type.label }}</span>
          <span class="text-xs text-muted">{{ type.description }}</span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
