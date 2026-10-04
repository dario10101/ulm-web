<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import IncomeSourcesPanel from '@/components/params/IncomeSourcesPanel.vue'
import IncomeSubcategoriesPanel from '@/components/params/IncomeSubcategoriesPanel.vue'
import TagsPanel from '@/components/params/TagsPanel.vue'
import { recordParamPanels } from '@/config/paramPanels'
import { recordTypes } from '@/config/recordTypes'

/**
 * Parametros de un dominio, abiertos desde "View records"
 * (/admin/records/income/sources). Cada panel tiene su URL; las pestañas
 * permiten saltar entre los del mismo tipo de registro.
 */
const route = useRoute()
const router = useRouter()

const recordType = computed(() => recordTypes.find((t) => t.id === route.params.type))
const panels = computed(() => recordParamPanels[String(route.params.type)] ?? [])
const active = computed(() => panels.value.find((p) => p.id === route.params.panel) ?? null)

// Tipo sin paneles o panel inexistente: de vuelta a los registros de ese tipo.
watch(
  active,
  (panel) => {
    if (!panel) router.replace({ name: 'admin-records', params: { type: route.params.type } })
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="active && recordType" class="space-y-6">
    <div>
      <RouterLink
        :to="{ name: 'admin-records', params: { type: recordType.id } }"
        class="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft class="h-4 w-4" />
        Back to {{ recordType.label.toLowerCase() }} records
      </RouterLink>
      <h1 class="text-xl font-semibold text-foreground">{{ recordType.label }} settings</h1>
      <p class="text-sm text-muted">
        Your own lists for {{ recordType.label.toLowerCase() }} records. Deleting something that's
        already used archives it instead, so your history stays intact.
      </p>
    </div>

    <nav v-if="panels.length > 1" class="flex flex-wrap gap-2 border-b border-subtle pb-4">
      <RouterLink
        v-for="panel in panels"
        :key="panel.id"
        :to="{ name: 'admin-record-params', params: { type: recordType.id, panel: panel.id } }"
        class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        :class="
          active.id === panel.id
            ? 'bg-accent/10 text-accent-text'
            : 'text-muted hover:bg-surface hover:text-foreground'
        "
      >
        <component :is="panel.icon" class="h-4 w-4" />
        {{ panel.label }}
      </RouterLink>
    </nav>

    <div class="max-w-3xl">
      <TagsPanel v-if="active.id === 'tags'" />
      <IncomeSourcesPanel v-else-if="active.id === 'sources'" />
      <IncomeSubcategoriesPanel v-else-if="active.id === 'subcategories'" />
    </div>
  </div>
</template>
