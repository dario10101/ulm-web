<script setup lang="ts">
import { onMounted, ref } from 'vue'

import CatalogList from '@/components/params/CatalogList.vue'
import ColorPicker from '@/components/params/ColorPicker.vue'
import ConfirmDeleteDialog from '@/components/params/ConfirmDeleteDialog.vue'
import IconPicker from '@/components/params/IconPicker.vue'
import ParamDialog from '@/components/params/ParamDialog.vue'
import { useCatalogPanel } from '@/composables/useCatalogPanel'
import { useExpenseOptions } from '@/composables/useExpenseOptions'
import { financeColorClasses, financeIcon } from '@/config/financeVisuals'
import type { CatalogApi } from '@/services/paramsApi'
import type { IconCatalogAdmin, IconCatalogWritePayload } from '@/types/params'

/**
 * Categorias de gasto y metodos de pago: catalogos globales (solo admin) con
 * los mismos campos (nombre, color, icono). `noun` es como se llama un item
 * ("category", "payment method").
 */
const props = defineProps<{
  api: CatalogApi<IconCatalogAdmin, IconCatalogWritePayload>
  title: string
  noun: string
  emptyText: string
}>()

const expenseOptions = useExpenseOptions()

const panel = useCatalogPanel(props.api, {
  toPayload: (item: IconCatalogAdmin) => ({
    name: item.name,
    icon_key: item.icon_key,
    color_key: item.color_key,
  }),
  onChanged: expenseOptions.invalidate,
})
const { dialogOpen, editing, saving, formError, deleting, deleteSaving, deleteError } = panel

const name = ref('')
const colorKey = ref('slate')
const iconKey = ref('package')

function openCreate() {
  name.value = ''
  colorKey.value = 'slate'
  iconKey.value = 'package'
  panel.openCreate()
}

function openEdit(item: IconCatalogAdmin) {
  name.value = item.name
  colorKey.value = item.color_key
  iconKey.value = item.icon_key
  panel.openEdit(item)
}

function submit() {
  panel.save({
    name: name.value,
    icon_key: iconKey.value,
    color_key: colorKey.value,
    status: editing.value?.status,
  })
}

onMounted(panel.load)
</script>

<template>
  <div>
    <CatalogList
      :title="title"
      :add-label="`Add ${noun}`"
      :empty-text="emptyText"
      :items="panel.items.value"
      :loading="panel.loading.value"
      :error="panel.loadError.value"
      :notice="panel.notice.value"
      @add="openCreate"
      @edit="openEdit"
      @remove="panel.askDelete"
      @restore="panel.restore"
    >
      <template #visual="{ item }">
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          :class="financeColorClasses(item.color_key).bg"
        >
          <component
            :is="financeIcon(item.icon_key)"
            class="h-4 w-4"
            :class="financeColorClasses(item.color_key).text"
          />
        </span>
      </template>
    </CatalogList>

    <ParamDialog
      :open="dialogOpen"
      :title="editing ? `Edit ${noun}` : `New ${noun}`"
      :saving="saving"
      :error="formError"
      @close="panel.closeDialog"
      @submit="submit"
    >
      <div class="flex items-end gap-3">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          :class="financeColorClasses(colorKey).bg"
          aria-hidden="true"
        >
          <component
            :is="financeIcon(iconKey)"
            class="h-5 w-5"
            :class="financeColorClasses(colorKey).text"
          />
        </span>
        <label class="block flex-1 text-sm">
          <span class="mb-1 block text-muted">Name *</span>
          <input
            v-model="name"
            type="text"
            maxlength="120"
            required
            class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div class="text-sm">
        <span class="mb-1.5 block text-muted">Color</span>
        <ColorPicker v-model="colorKey" />
      </div>
      <div class="text-sm">
        <span class="mb-1.5 block text-muted">Icon</span>
        <IconPicker v-model="iconKey" :color-key="colorKey" />
      </div>
      <p class="text-xs text-muted">Shared by every user: changes apply to everyone's records.</p>
    </ParamDialog>

    <ConfirmDeleteDialog
      :item="deleting"
      :saving="deleteSaving"
      :error="deleteError"
      @close="deleting = null"
      @confirm="panel.confirmDelete"
    />
  </div>
</template>
