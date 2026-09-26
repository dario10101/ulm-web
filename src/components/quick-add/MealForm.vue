<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed, onDeactivated, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { defaultMealTypeForHour, mealTypeOptions } from '@/config/mealTypes'
import { parseIsoDate, todayIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { buildDateTime, clockFromMinutes, formatLocalDateTime } from '@/lib/time'
import { createMeal } from '@/services/mealsApi'
import type { MealType } from '@/types/meal'

// Formulario de meal: end-to-end real contra la API (ver mealsApi). El tipo
// de comida, la hora y los componentes del plato son los campos "vivos"; el
// resto son inputs simples.

interface MealComponent {
  id: number
  name: string
  percent: number
}

let mealComponentSeq = 0
function makeMealComponent(): MealComponent {
  mealComponentSeq += 1
  return { id: mealComponentSeq, name: '', percent: 0 }
}

// Reparte el 100% en partes iguales entre los componentes actuales (el ultimo
// se lleva el resto del redondeo, para que la suma cierre siempre en 100).
function equalizeMealComponents() {
  const items = mealComponents.value
  if (!items.length) return
  const base = Math.floor(100 / items.length)
  const remainder = 100 - base * items.length
  items.forEach((item, i) => {
    item.percent = base + (i < items.length - remainder ? 0 : 1)
  })
}

function addMealComponent() {
  mealComponents.value.push(makeMealComponent())
  equalizeMealComponents()
}

function removeMealComponent(id: number) {
  mealComponents.value = mealComponents.value.filter((c) => c.id !== id)
  equalizeMealComponents()
}

// El slider de cada componente es libre e independiente (no se tocan entre
// si al arrastrar uno): el reparto a partes iguales solo se aplica como
// punto de partida al agregar/quitar. El % final normalizado a 100 se
// calcula aparte (ver mealComponentsTotal / mealComponentFinalPercent), no
// se fuerza en vivo mientras el usuario ajusta las barras.
const mealComponentsTotal = computed(() =>
  mealComponents.value.reduce((sum, c) => sum + c.percent, 0),
)

function mealComponentFinalPercent(component: MealComponent): number {
  const total = mealComponentsTotal.value
  if (total <= 0) return 0
  return Math.round((component.percent / total) * 100)
}

const mealType = ref<MealType>(defaultMealTypeForHour(new Date().getHours()))
const mealDate = ref(todayIsoDate())
const mealPortion = ref(50)
const mealComponents = ref<MealComponent[]>([makeMealComponent()])
equalizeMealComponents()
const mealDrink = ref('')
const mealComments = ref('')

// Hora por defecto: la actual, redondeada al bloque de 30 minutos mas cercano.
const mealMinuteOptions = [0, 30]
const initialMealClock = clockFromMinutes(
  Math.round((new Date().getHours() * 60 + new Date().getMinutes()) / 30) * 30,
)
const mealHour = ref(initialMealClock.hour)
const mealMinute = ref(initialMealClock.minute)
const mealAmPm = ref(initialMealClock.ampm)

const mealSubmitting = ref(false)
const mealError = ref<string | null>(null)
const mealSaved = ref(false)

// Payload de componentes: solo los que tienen nombre, con su % final ya
// normalizado a 100 (mealComponentFinalPercent), no el valor libre del slider.
function buildMealComponentsPayload() {
  return mealComponents.value
    .filter((c) => c.name.trim().length > 0)
    .map((c) => ({ name: c.name.trim(), percent: mealComponentFinalPercent(c) }))
}

async function handleMealSubmit() {
  mealError.value = null

  const components = buildMealComponentsPayload()
  const drink = mealDrink.value.trim()
  if (!components.length && !drink) {
    mealError.value = 'Log at least one plate component or a drink.'
    mealSaved.value = false
    return
  }

  const recordedOn = buildDateTime(
    parseIsoDate(mealDate.value),
    mealHour.value,
    mealMinute.value,
    mealAmPm.value,
  )

  mealSubmitting.value = true
  try {
    await createMeal({
      recorded_on: formatLocalDateTime(recordedOn),
      meal_type: mealType.value,
      meal_size: mealPortion.value,
      components,
      drink: drink || null,
      note: mealComments.value.trim() || null,
    })
    mealSaved.value = true
    mealComponents.value = [makeMealComponent()]
    equalizeMealComponents()
    mealDrink.value = ''
    mealComments.value = ''
  } catch (err) {
    mealError.value = err instanceof ApiError ? err.message : 'Could not save this meal.'
  } finally {
    mealSubmitting.value = false
  }
}

// La pagina envuelve los forms en KeepAlive: el borrador sobrevive al cambiar
// de tipo, pero el feedback del ultimo envio no debe reaparecer al volver.
onDeactivated(() => {
  mealSaved.value = false
  mealError.value = null
})
</script>

<template>
  <BaseCard title="New meal">
    <form
      class="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-10 lg:gap-y-5 lg:space-y-0"
      @submit.prevent="handleMealSubmit"
    >
      <!-- Fila 1: tipo de comida (sugerido segun la hora) + fecha + hora, lado a lado y compactas -->
      <div class="flex flex-wrap items-end gap-3">
        <label class="text-sm">
          <span class="mb-1 block text-muted">Meal type *</span>
          <select
            v-model="mealType"
            class="w-44 rounded-lg border border-subtle bg-surface px-2 py-1.5 text-sm"
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
            class="w-36 rounded-lg border border-subtle bg-surface px-2 py-1.5 text-sm"
          />
        </label>

        <div class="text-sm">
          <span class="mb-1 block text-muted">Time *</span>
          <div class="flex gap-1">
            <select
              v-model.number="mealHour"
              class="w-14 rounded-lg border border-subtle bg-surface px-1.5 py-1.5 text-sm"
            >
              <option v-for="h in 12" :key="h" :value="h">{{ h }}</option>
            </select>
            <select
              v-model.number="mealMinute"
              class="w-16 rounded-lg border border-subtle bg-surface px-1.5 py-1.5 text-sm"
            >
              <option v-for="m in mealMinuteOptions" :key="m" :value="m">
                {{ String(m).padStart(2, '0') }}
              </option>
            </select>
            <select
              v-model="mealAmPm"
              class="w-16 rounded-lg border border-subtle bg-surface px-1.5 py-1.5 text-sm"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Cantidad total del plato -->
      <div class="text-sm">
        <div class="mb-1 flex w-56 items-center justify-between">
          <span class="text-muted">Portion size</span>
          <span class="font-medium text-foreground">{{ mealPortion }}%</span>
        </div>
        <input
          v-model.number="mealPortion"
          type="range"
          min="0"
          max="100"
          step="5"
          class="input-range w-56"
        />
      </div>

      <!-- Componentes del plato: N filas de nombre libre + slider libre de % -->
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          <span class="text-sm text-muted">Plate components</span>
          <button
            type="button"
            class="text-xs font-medium text-accent-text hover:underline"
            @click="addMealComponent"
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

        <!-- Cada barra es independiente: el usuario la ajusta libre, el % final
           normalizado a 100 se calcula aparte (mealComponentFinalPercent). -->
        <div
          v-for="component in mealComponents"
          :key="component.id"
          class="flex items-center gap-2"
        >
          <input
            v-model="component.name"
            type="text"
            placeholder="e.g. RICE"
            maxlength="60"
            class="w-24 shrink-0 rounded-md border border-subtle bg-surface px-2 py-1 text-sm"
            @input="component.name = component.name.toUpperCase()"
          />
          <input
            v-model.number="component.percent"
            type="range"
            min="0"
            max="100"
            class="input-range w-28 shrink-0"
          />
          <span class="w-9 shrink-0 text-right text-xs text-muted">
            {{ mealComponentFinalPercent(component) }}%
          </span>
          <button
            type="button"
            title="Remove component"
            class="shrink-0 rounded-md p-1 text-muted hover:bg-surface-hover hover:text-ruby-text"
            @click="removeMealComponent(component.id)"
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
          class="w-44 rounded-lg border border-subtle bg-surface px-2 py-1.5 text-sm"
          @input="mealDrink = mealDrink.toUpperCase()"
        />
      </label>

      <label class="block text-sm">
        <span class="mb-1 block text-muted">Additional comments</span>
        <textarea
          v-model="mealComments"
          rows="2"
          class="w-full max-w-md rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
        />
      </label>

      <div class="flex items-center gap-3 lg:col-span-2">
        <BaseButton type="submit" :disabled="mealSubmitting">
          {{ mealSubmitting ? 'Saving...' : 'Save' }}
        </BaseButton>
        <span v-if="mealSaved" class="text-sm text-accent-text">Saved.</span>
        <span v-if="mealError" class="text-sm text-ruby-text">{{ mealError }}</span>
      </div>
    </form>
  </BaseCard>
</template>
