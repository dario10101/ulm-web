<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'

/**
 * Confirmacion generica de una accion destructiva: titulo, explicacion
 * (slot) y confirmar/cancelar. ConfirmDeleteDialog es la variante de los
 * catalogos (borrar o archivar segun uso).
 */
withDefaults(
  defineProps<{
    open: boolean
    title: string
    confirmLabel?: string
    saving?: boolean
    error?: string | null
  }>(),
  { confirmLabel: 'Delete', saving: false, error: null },
)

const emit = defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
    @click.self="emit('close')"
  >
    <div
      role="alertdialog"
      :aria-label="title"
      class="w-full max-w-sm space-y-4 rounded-xl border border-subtle bg-surface p-5"
    >
      <h3 class="text-sm font-semibold text-foreground">{{ title }}</h3>
      <div class="text-sm text-muted"><slot /></div>
      <p v-if="error" class="text-sm text-ruby-text">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton>
        <BaseButton :disabled="saving" data-test="confirm" @click="emit('confirm')">
          {{ saving ? 'Working...' : confirmLabel }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
