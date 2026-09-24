<script setup lang="ts">
import { Check, Copy, Pencil, Trash2 } from '@lucide/vue'
import { ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useCategories } from '@/composables/useCategories'
import { formatDateLong } from '@/lib/date'
import { timeRangeLabel } from '@/lib/timeline'
import type { CalendarTaskOccurrence } from '@/types/calendarTask'

/**
 * Detalle de una tarea. En el calendario el chip solo muestra el nombre;
 * categoria, rango de fecha/hora y las acciones viven aca (un chip de duracion
 * corta no tiene espacio para mostrarlas).
 */
const props = defineProps<{
  task: CalendarTaskOccurrence | null
  syncingTaskId: number | null
  syncResults: Record<number, { message: string; isError: boolean }>
}>()

const emit = defineEmits<{
  close: []
  edit: [occurrence: CalendarTaskOccurrence]
  remove: [occurrence: CalendarTaskOccurrence]
  addToChecklist: [occurrence: CalendarTaskOccurrence]
}>()

const { categoryName } = useCategories()

const copyLabel = ref('Copy')

watch(
  () => props.task,
  () => {
    copyLabel.value = 'Copy'
  },
)

async function copyDetail() {
  if (!props.task?.detail) return
  try {
    await navigator.clipboard.writeText(props.task.detail)
    copyLabel.value = 'Copied!'
  } catch {
    copyLabel.value = 'Could not copy'
  }
}
</script>

<template>
  <div
    v-if="task"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
      <h3 class="mb-1 text-sm font-semibold text-foreground">{{ task.name }}</h3>
      <p class="mb-3 text-xs text-muted">
        {{ categoryName(task.category_id) }} ·
        {{ formatDateLong(new Date(task.occurrence_local)) }} ·
        {{ timeRangeLabel(task) }}
      </p>
      <p class="whitespace-pre-wrap text-sm text-muted">
        {{ task.detail || 'No details for this task.' }}
      </p>

      <p
        v-if="syncResults[task.id]"
        class="mt-3 text-xs"
        :class="syncResults[task.id].isError ? 'text-ruby-text' : 'text-accent-text'"
      >
        {{ syncResults[task.id].message }}
      </p>

      <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-1">
          <button
            type="button"
            title="Edit task"
            class="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
            @click="emit('edit', task)"
          >
            <Pencil class="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Delete task"
            class="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
            @click="emit('remove', task)"
          >
            <Trash2 class="h-4 w-4" />
          </button>
          <button
            v-if="!task.add_to_checklist"
            type="button"
            :disabled="syncingTaskId === task.id"
            class="ml-1 text-xs text-accent-text hover:underline disabled:opacity-50"
            @click="emit('addToChecklist', task)"
          >
            + Checklist
          </button>
        </div>

        <div class="flex items-center gap-2">
          <BaseButton v-if="task.detail" variant="secondary" type="button" @click="copyDetail">
            <Copy class="h-4 w-4" />
            {{ copyLabel }}
          </BaseButton>
          <BaseButton variant="success" type="button" @click="emit('close')">
            <Check class="h-4 w-4" />
            OK
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
