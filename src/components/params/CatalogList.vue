<script setup lang="ts" generic="Item extends AdminCatalogItem">
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from '@lucide/vue'
import { computed, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import type { AdminCatalogItem } from '@/types/params'

/**
 * Lista generica de un catalogo administrable: filas con visual (slot), uso,
 * estado y acciones. Los archivados se ocultan salvo que se pidan, porque
 * son historia, no opciones. `groupLabel` agrupa las filas (ej. subcategorias
 * por fuente); los items deben llegar ya ordenados por grupo.
 */
const props = withDefaults(
  defineProps<{
    title: string
    addLabel: string
    items: Item[]
    loading: boolean
    error: string | null
    notice?: string | null
    emptyText: string
    groupLabel?: (item: Item) => string
  }>(),
  { notice: null, groupLabel: undefined },
)

const emit = defineEmits<{
  add: []
  edit: [item: Item]
  remove: [item: Item]
  restore: [item: Item]
}>()

const showArchived = ref(false)

const archivedCount = computed(() => props.items.filter((i) => i.status === 'DISABLED').length)

const visible = computed(() =>
  showArchived.value ? props.items : props.items.filter((i) => i.status === 'ENABLED'),
)

/** Filas con el encabezado de grupo donde cambia (si hay agrupacion). */
const rows = computed(() =>
  visible.value.map((item, index) => {
    const group = props.groupLabel?.(item) ?? null
    const previous =
      index > 0 && props.groupLabel ? props.groupLabel(visible.value[index - 1]) : null
    return { item, groupHeader: group !== null && group !== previous ? group : null }
  }),
)

function usageText(item: Item): string {
  if (item.usage_count === 0) return 'Not used yet'
  return `Used in ${item.usage_count} record${item.usage_count === 1 ? '' : 's'}`
}
</script>

<template>
  <BaseCard>
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-sm font-semibold text-foreground">
        {{ title }}
        <span class="font-normal text-muted">({{ items.length - archivedCount }})</span>
      </h2>
      <div class="flex items-center gap-3">
        <label
          v-if="archivedCount"
          class="flex cursor-pointer items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <input v-model="showArchived" type="checkbox" class="h-3.5 w-3.5 accent-cta" />
          Show archived ({{ archivedCount }})
        </label>
        <BaseButton variant="secondary" class="!px-3 !py-1.5" @click="emit('add')">
          <Plus class="h-4 w-4" />
          {{ addLabel }}
        </BaseButton>
      </div>
    </header>

    <p v-if="notice" class="mb-3 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent-text">
      {{ notice }}
    </p>

    <p v-if="loading && !items.length" class="py-6 text-center text-sm text-muted">Loading...</p>
    <p v-else-if="error" class="py-6 text-center text-sm text-ruby-text">{{ error }}</p>
    <p v-else-if="!visible.length" class="py-6 text-center text-sm text-muted">{{ emptyText }}</p>

    <ul v-else class="divide-y divide-subtle">
      <template v-for="{ item, groupHeader } in rows" :key="item.id">
        <li
          v-if="groupHeader"
          class="pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted first:pt-0"
        >
          {{ groupHeader }}
        </li>
        <li
          class="flex items-center gap-3 py-2.5"
          :class="item.status === 'DISABLED' ? 'opacity-60' : ''"
          :data-test="`catalog-row-${item.id}`"
        >
          <slot name="visual" :item="item" />
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-2 text-sm text-foreground">
              <span class="truncate">{{ item.name }}</span>
              <span
                v-if="item.status === 'DISABLED'"
                class="inline-flex shrink-0 items-center gap-1 rounded-full border border-subtle px-1.5 py-0.5 text-[10px] font-medium text-muted"
              >
                <Archive class="h-3 w-3" />
                Archived
              </span>
            </p>
            <p class="truncate text-xs text-muted">
              <slot name="details" :item="item" />{{ usageText(item) }}
            </p>
          </div>
          <div class="flex shrink-0 gap-1">
            <button
              type="button"
              :title="`Edit ${item.name}`"
              class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
              @click="emit('edit', item)"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              v-if="item.status === 'DISABLED'"
              type="button"
              :title="`Restore ${item.name}`"
              class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-success-text"
              @click="emit('restore', item)"
            >
              <ArchiveRestore class="h-4 w-4" />
            </button>
            <button
              v-else
              type="button"
              :title="`Delete ${item.name}`"
              class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
              @click="emit('remove', item)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </li>
      </template>
    </ul>
  </BaseCard>
</template>
