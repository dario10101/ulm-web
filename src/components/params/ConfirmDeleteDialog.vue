<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import type { AdminCatalogItem } from '@/types/params'

/**
 * Confirmacion del borrado hibrido: le dice al usuario, antes de confirmar,
 * si el item se va a borrar o a archivar (depende de si tiene registros).
 */
defineProps<{
  item: AdminCatalogItem | null
  saving: boolean
  error: string | null
}>()

const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <div
    v-if="item"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
    @click.self="emit('close')"
  >
    <div
      role="alertdialog"
      :aria-label="`Delete ${item.name}`"
      class="w-full max-w-sm space-y-4 rounded-xl border border-subtle bg-surface p-5"
    >
      <h3 class="text-sm font-semibold text-foreground">
        {{ item.usage_count ? 'Archive' : 'Delete' }} "{{ item.name }}"?
      </h3>
      <p v-if="item.usage_count" class="text-sm text-muted">
        It's used in {{ item.usage_count }} record{{ item.usage_count === 1 ? '' : 's' }}, so it
        will be <strong class="text-foreground">archived</strong> instead of deleted: hidden from
        forms, but kept in your history and analytics. You can restore it later.
      </p>
      <p v-else class="text-sm text-muted">
        No record uses it, so it will be
        <strong class="text-foreground">deleted permanently</strong>.
      </p>
      <slot :item="item" />
      <p v-if="error" class="text-sm text-ruby-text">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton>
        <button
          type="button"
          :disabled="saving"
          class="inline-flex items-center justify-center rounded-lg bg-ruby px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ruby/90 disabled:cursor-not-allowed disabled:opacity-50"
          @click="emit('confirm')"
        >
          {{ saving ? 'Working...' : item.usage_count ? 'Archive' : 'Delete' }}
        </button>
      </div>
    </div>
  </div>
</template>
