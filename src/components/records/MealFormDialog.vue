<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { mealTypeOptions } from '@/config/mealTypes'
import { formatIsoDate, parseIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { parseMealContent } from '@/lib/mealContent'
import { buildDateTime, clockFromDate, formatLocalDateTime, parseLocalDateTime } from '@/lib/time'
import { updateMeal } from '@/services/mealsApi'
import type { Meal, MealType } from '@/types/meal'

/** Edicion de un registro de comida ya existente (mismos campos que el alta en QuickAddPage). */
const props = defineProps<{ record: Meal | null }>()

const emit = defineEmits<{ close: []; saved: [] }>()

const mealMinuteOptions = [0, 30]

interface MealComponent {
  id: number
  name: string
  percent: number
}

let componentSeq = 0
function makeComponent(name = '', percent = 0): MealComponent {
  componentSeq += 1
  return { id: componentSeq, name, percent }
}

const mealType = ref<MealType>('LUNCH')
const mealDate = ref('')
const mealHour = ref(12)
const mealMinute = ref(0)
const mealAmPm = ref<'AM' | 'PM'>('PM')
const mealPortion = ref(50)
const mealComponents = ref<MealComponent[]>([])
const mealDrink = ref('')
const mealComments = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.record,
  (record) => {
    error.value = null
    if (!record) return

    mealType.value = record.meal_type
    const dt = parseLocalDateTime(record.recorded_on)
    mealDate.value = formatIsoDate(dt)
    const clock = clockFromDate(dt)
    mealHour.value = clock.hour
    mealMinute.value = clock.minute
    mealAmPm.value = clock.ampm

    mealPortion.value = record.meal_size
    mealComponents.value = parseMealContent(record.meal_content).map((c) =>
      makeComponent(c.name, c.percent),
    )
    mealDrink.value = record.drink ?? ''
    mealComments.value = record.note ?? ''
  },
  { immediate: true },
)

function addComponent() {
  mealComponents.value.push(makeComponent())
}

function removeComponent(id: number) {
  mealComponents.value = mealComponents.value.filter((c) => c.id !== id)
}

// El slider de cada componente es libre e independiente (mismo criterio que
// QuickAddPage): el % final se normaliza aparte, no se fuerza en vivo.
const componentsTotal = computed(() => mealComponents.value.reduce((sum, c) => sum + c.percent, 0))

function finalPercent(component: MealComponent): number {
  const total = componentsTotal.value
  if (total <= 0) return 0
  return Math.round((component.percent / total) * 100)
}

async function submit() {
  if (!props.record) return
  error.value = null

  const components = mealComponents.value
    .filter((c) => c.name.trim().length > 0)
    .map((c) => ({ name: c.name.trim(), percent: finalPercent(c) }))
  const drink = mealDrink.value.trim()
  if (!components.length && !drink) {
    error.value = 'Log at least one plate component or a drink.'
    return
  }
  if (!mealDate.value) {
    error.value = 'Date is required.'
    return
  }

  const recordedOn = buildDateTime(
    parseIsoDate(mealDate.value),
    mealHour.value,
    mealMinute.value,
    mealAmPm.value,
  )

  saving.value = true
  try {
    await updateMeal(props.record.id, {
      recorded_on: formatLocalDateTime(recordedOn),
      meal_type: mealType.value,
      meal_size: mealPortion.value,
      components,
      drink: drink || null,
      note: mealComments.value.trim() || null,
    })
    emit('saved')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not save this meal.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    v-if="record"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
    @click.self="emit('close')"
  >
    <form
      class="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl border border-subtle bg-surface p-5"
      @submit.prevent="submit"
    >
      <h3 class="text-sm font-semibold text-foreground">Edit meal</h3>

      <div class="flex flex-wrap items-end gap-3">
        <label class="text-sm">
          <span class="mb-1 block text-muted">Meal type *</span>
          <select
            v-model="mealType"
            class="w-44 rounded-lg border border-subtle bg-background px-2 py-1.5 text-sm"
          >
            <option v-for="opt in mealTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </label>

        <label class="text-sm">
          <span class="mb-1 block text-muted">Date *</span>
          <input
            v-model="mealDate"
            type="date"
            class="w-36 rounded-lg border border-subtle bg-background px-2 py-1.5 text-sm"
          />
        </label>

        <div class="text-sm">
          <span class="mb-1 block text-muted">Time *</span>
          <div class="flex gap-1">
            <select
              v-model.number="mealHour"
              class="w-14 rounded-lg border border-subtle bg-background px-1.5 py-1.5 text-sm"
            >
              <option v-for="h in 12" :key="h" :value="h">{{ h }}</option>
            </select>
            <select
              v-model.number="mealMinute"
              class="w-16 rounded-lg border border-subtle bg-background px-1.5 py-1.5 text-sm"
            >
              <option v-for="m in mealMinuteOptions" :key="m" :value="m">
                {{ String(m).padStart(2, '0') }}
              </option>
            </select>
            <select
              v-model="mealAmPm"
              class="w-16 rounded-lg border border-subtle bg-background px-1.5 py-1.5 text-sm"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      </div>

      <div class="text-sm">
        <div class="mb-1 flex w-56 items-center justify-between">
          <span class="text-muted">Portion size</span>
          <span class="font-medium text-foreground">{{ mealPortion }}%</span>
        </div>
        <input v-model.number="mealPortion" type="range" min="0" max="100" step="5" class="input-range w-56" />
      </div>

      <div class="space-y-2">
        <div class="flex items-center gap-3">
          <span class="text-sm text-muted">Plate components</span>
          <button
            type="button"
            class="text-xs font-medium text-accent-text hover:underline"
            @click="addComponent"
          >
            + Add component
          </button>
        </div>
        <p class="text-xs text-muted">Use the singular (e.g. EGG, not EGGS).</p>

        <p
          v-if="!mealComponents.length"
          class="rounded-lg border border-dashed border-subtle px-3 py-3 text-center text-xs text-muted"
        >
          No components yet — add one, or just log a drink below.
        </p>

        <div v-for="component in mealComponents" :key="component.id" class="flex items-center gap-2">
          <input
            v-model="component.name"
            type="text"
            placeholder="e.g. RICE"
            maxlength="60"
            class="w-24 shrink-0 rounded-md border border-subtle bg-background px-2 py-1 text-sm"
            @input="component.name = component.name.toUpperCase()"
          />
          <input
            v-model.number="component.percent"
            type="range"
            min="0"
            max="100"
            class="input-range w-28 shrink-0"
          />
          <span class="w-9 shrink-0 text-right text-xs text-muted">{{ finalPercent(component) }}%</span>
          <button
            type="button"
            title="Remove component"
            class="shrink-0 rounded-md p-1 text-muted hover:bg-surface-hover hover:text-ruby-text"
            @click="removeComponent(component.id)"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>

      <label class="block text-sm">
        <span class="mb-1 block text-muted">Drink (optional)</span>
        <input
          v-model="mealDrink"
          type="text"
          placeholder="e.g. WATER"
          maxlength="60"
          class="w-44 rounded-lg border border-subtle bg-background px-2 py-1.5 text-sm"
          @input="mealDrink = mealDrink.toUpperCase()"
        />
      </label>

      <label class="block text-sm">
        <span class="mb-1 block text-muted">Additional comments</span>
        <textarea
          v-model="mealComments"
          rows="2"
          class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
        />
      </label>

      <p v-if="error" class="text-sm text-ruby-text">{{ error }}</p>

      <div class="flex justify-end gap-2 pt-1">
        <BaseButton variant="secondary" type="button" :disabled="saving" @click="emit('close')">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" type="submit" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save' }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
