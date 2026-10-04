<script setup lang="ts">
import { Landmark } from '@lucide/vue'
import { onMounted, ref } from 'vue'

import CatalogList from '@/components/params/CatalogList.vue'
import ConfirmDeleteDialog from '@/components/params/ConfirmDeleteDialog.vue'
import ParamDialog from '@/components/params/ParamDialog.vue'
import { useCatalogPanel } from '@/composables/useCatalogPanel'
import { useIncomeOptions } from '@/composables/useIncomeOptions'
import { INCOME_TYPE_OPTIONS, incomeTypeLabel } from '@/lib/incomeParams'
import { incomeSourcesApi } from '@/services/paramsApi'
import type { IncomeCatalogType } from '@/types/income'
import type { IncomeSourceAdmin } from '@/types/params'

const incomeOptions = useIncomeOptions()

const panel = useCatalogPanel(incomeSourcesApi, {
  toPayload: (source: IncomeSourceAdmin) => ({ name: source.name, type: source.type }),
  onChanged: incomeOptions.invalidate,
})
const { dialogOpen, editing, saving, formError, deleting, deleteSaving, deleteError } = panel

const name = ref('')
const type = ref<IncomeCatalogType>('DIRECT')

function openCreate() {
  name.value = ''
  type.value = 'DIRECT'
  panel.openCreate()
}

function openEdit(source: IncomeSourceAdmin) {
  name.value = source.name
  type.value = source.type
  panel.openEdit(source)
}

function submit() {
  panel.save({ name: name.value, type: type.value, status: editing.value?.status })
}

onMounted(panel.load)
</script>

<template>
  <div>
    <CatalogList
      title="Income sources"
      add-label="Add source"
      empty-text="No sources yet. A source is where money comes from (a salary, a savings account)."
      :items="panel.items.value"
      :loading="panel.loading.value"
      :error="panel.loadError.value"
      :notice="panel.notice.value"
      @add="openCreate"
      @edit="openEdit"
      @remove="panel.askDelete"
      @restore="panel.restore"
    >
      <template #visual>
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <Landmark class="h-4 w-4 text-accent-text" />
        </span>
      </template>
      <template #details="{ item }">
        {{ incomeTypeLabel(item.type) }} · {{ item.subcategory_count }} subcategor{{
          item.subcategory_count === 1 ? 'y' : 'ies'
        }}
        ·
      </template>
    </CatalogList>

    <ParamDialog
      :open="dialogOpen"
      :title="editing ? 'Edit source' : 'New source'"
      :saving="saving"
      :error="formError"
      @close="panel.closeDialog"
      @submit="submit"
    >
      <label class="block text-sm">
        <span class="mb-1 block text-muted">Name *</span>
        <input
          v-model="name"
          type="text"
          maxlength="120"
          required
          class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
        />
      </label>
      <fieldset class="text-sm">
        <legend class="mb-1.5 text-muted">Used for</legend>
        <div class="grid gap-1.5">
          <label
            v-for="option in INCOME_TYPE_OPTIONS"
            :key="option.value"
            class="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition-colors"
            :class="
              type === option.value
                ? 'border-accent bg-accent/10'
                : 'border-subtle hover:border-accent-text/50'
            "
          >
            <input v-model="type" type="radio" :value="option.value" class="mt-1 accent-cta" />
            <span>
              <span class="block font-medium text-foreground">{{ option.label }}</span>
              <span class="block text-xs text-muted">{{ option.hint }}</span>
            </span>
          </label>
        </div>
      </fieldset>
      <p v-if="editing && editing.usage_count" class="text-xs text-muted">
        This source has records: its type can only widen to cover them (e.g. to "Both").
      </p>
    </ParamDialog>

    <ConfirmDeleteDialog
      :item="deleting"
      :saving="deleteSaving"
      :error="deleteError"
      @close="deleting = null"
      @confirm="panel.confirmDelete"
    >
      <template #default="{ item }">
        <p
          v-if="!item.usage_count && (item as IncomeSourceAdmin).subcategory_count"
          class="text-sm text-muted"
        >
          Its {{ (item as IncomeSourceAdmin).subcategory_count }} subcategories will be deleted too.
        </p>
      </template>
    </ConfirmDeleteDialog>
  </div>
</template>
