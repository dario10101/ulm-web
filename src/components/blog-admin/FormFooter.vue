<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'

// Pie comun de los formularios de plantilla: estado y boton de guardar.
defineProps<{ dirty: boolean; saving: boolean; error: string | null; saved: boolean }>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-3 border-t border-subtle pt-4">
    <p v-if="error" class="mr-auto text-sm text-ruby-text" role="alert">{{ error }}</p>
    <p v-else-if="dirty" class="mr-auto text-xs text-muted">Unsaved changes</p>
    <p v-else-if="saved" class="mr-auto text-xs text-success-text">Saved</p>
    <BaseButton type="submit" :disabled="!dirty || saving">
      {{ saving ? 'Saving...' : 'Save content' }}
    </BaseButton>
  </div>
</template>
