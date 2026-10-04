<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'

/** Modal de alta/edicion de un parametro: titulo, campos (slot), error y
 * botones. Mismo estilo que los dialogos de "View records". */
withDefaults(
  defineProps<{
    open: boolean
    title: string
    saving?: boolean
    error?: string | null
    submitLabel?: string
  }>(),
  { saving: false, error: null, submitLabel: 'Save' },
)

const emit = defineEmits<{ close: []; submit: [] }>()
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
    @click.self="emit('close')"
  >
    <form
      role="dialog"
      :aria-label="title"
      class="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl border border-subtle bg-surface p-5"
      @submit.prevent="emit('submit')"
    >
      <h3 class="text-sm font-semibold text-foreground">{{ title }}</h3>

      <slot />

      <p v-if="error" class="text-sm text-ruby-text">{{ error }}</p>

      <div class="flex justify-end gap-2 pt-1">
        <BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton>
        <BaseButton type="submit" :disabled="saving">
          {{ saving ? 'Saving...' : submitLabel }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
