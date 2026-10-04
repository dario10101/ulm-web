<script setup lang="ts">
import { computed, onDeactivated, onMounted, ref, watch } from 'vue'

import TagPicker from '@/components/finance/TagPicker.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CollapsibleNote from '@/components/ui/CollapsibleNote.vue'
import CopAmountInput from '@/components/ui/CopAmountInput.vue'
import { periodKey, useIncomeOptions } from '@/composables/useIncomeOptions'
import { withCurrent } from '@/lib/catalogOptions'
import { formatCOP, parseAmountInput, toAmountInput } from '@/lib/currency'
import { MONTH_NAMES_EN, parseIsoDate, previousMonth } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { computeMonthlyInterest } from '@/lib/income'
import { createInterestIncome, updateInterestIncome } from '@/services/incomesApi'
import type { InterestIncome } from '@/types/income'

// Intereses (Tyba, cuenta de ahorros...): un registro por fuente y mes.
// Sin `record` es el alta; con `record` edita ese registro.
// "Interest entry" (automatico/manual) es solo de este formulario: el
// backend guarda el interes que llega, sin saber como se obtuvo.
type EntryMode = 'automatic' | 'manual'

const props = withDefaults(defineProps<{ record?: InterestIncome | null }>(), { record: null })
const emit = defineEmits<{ saved: [record: InterestIncome]; cancel: [] }>()

const { tags, ensureLoaded, sourcesFor, subcategoriesOf, endBalanceOf, setEndBalance } =
  useIncomeOptions()
const activeSources = sourcesFor('interest')
// Mas el item del registro editado si esta archivado (ver lib/catalogOptions).
const sources = computed(() =>
  withCurrent(activeSources.value, props.record ? [props.record.source] : []),
)
const isEdit = computed(() => props.record !== null)

const now = new Date()
const currentYear = now.getFullYear()
const currentMonthIndex = now.getMonth()
// Se registra el mes que ya cerro: por defecto el anterior (en enero, diciembre del anio pasado).
const defaultPeriod = previousMonth(currentYear, currentMonthIndex)
const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i)

const sourceId = ref<number | null>(null)
const subcategoryId = ref<number | null>(null)
// Cada subcategoria pertenece a una fuente: se ofrecen solo las de la elegida.
const activeSubcategories = subcategoriesOf(sourceId)
const subcategories = computed(() =>
  withCurrent(
    activeSubcategories.value,
    props.record?.subcategory.source_id === sourceId.value ? [props.record.subcategory] : [],
  ),
)
const tagOptions = computed(() => withCurrent(tags.value, props.record?.tags ?? []))
const year = ref(defaultPeriod.year)
const monthIndex = ref(defaultPeriod.monthIndex)
const mode = ref<EntryMode>('automatic')
const deposits = ref('0')
const withdrawals = ref('0')
const startBalance = ref('')
const endBalance = ref('')
const manualInterest = ref('')
const tagIds = ref<number[]>([])
const note = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)
const saved = ref(false)

// Un input vacio en aportes/retiros cuenta como 0; en saldos significa "sin dato".
function amountOrZero(text: string): number {
  const value = parseAmountInput(text)
  return Number.isFinite(value) ? value : 0
}
function amountOrNull(text: string): number | null {
  const value = parseAmountInput(text)
  return Number.isFinite(value) ? value : null
}
function inputOrEmpty(value: number | null): string {
  return value === null ? '' : toAmountInput(value)
}

// null mientras falte algun saldo: no se inventa un interes con datos incompletos.
const computedInterest = computed<number | null>(() => {
  const start = amountOrNull(startBalance.value)
  const end = amountOrNull(endBalance.value)
  if (start === null || end === null) return null
  // Redondeo a centavos: la resta en coma flotante puede dejar colas (0.1 + 0.2).
  const interest = computeMonthlyInterest({
    startBalance: start,
    endBalance: end,
    deposits: amountOrZero(deposits.value),
    withdrawals: amountOrZero(withdrawals.value),
  })
  return Math.round(interest * 100) / 100
})

watch(
  () => props.record,
  (record) => {
    if (!record) return
    const recordedOn = parseIsoDate(record.recorded_on)
    sourceId.value = record.source.id
    subcategoryId.value = record.subcategory.id
    year.value = recordedOn.getFullYear()
    monthIndex.value = recordedOn.getMonth()
    deposits.value = toAmountInput(record.deposits_amount)
    withdrawals.value = toAmountInput(record.withdrawals_amount)
    startBalance.value = inputOrEmpty(record.start_of_month_amount)
    endBalance.value = inputOrEmpty(record.end_of_month_amount)
    tagIds.value = record.tags.map((tag) => tag.id)
    note.value = record.note ?? ''
    error.value = null
    // Si los saldos guardados explican el interes, se abre en automatico; si
    // no (saldos vacios o interes digitado a mano), en manual con su valor.
    manualInterest.value = toAmountInput(record.amount)
    mode.value = computedInterest.value === record.amount ? 'automatic' : 'manual'
  },
  { immediate: true },
)

// Defaults en cuanto llegan las opciones (async): primera fuente, y la
// primera subcategoria de la fuente elegida cada vez que esta cambia (salvo
// que la actual siga perteneciendo a ella, ej. al editar).
watch(
  sources,
  (list) => {
    if (sourceId.value === null && list.length) sourceId.value = list[0].id
  },
  { immediate: true },
)
watch(
  subcategories,
  (list) => {
    // Sin opciones cargadas todavia no se toca: borraria la del registro en edicion.
    if (!sources.value.length) return
    if (!list.some((s) => s.id === subcategoryId.value)) subcategoryId.value = list[0]?.id ?? null
  },
  { immediate: true },
)

function isFutureMonth(index: number): boolean {
  return year.value === currentYear && index > currentMonthIndex
}

// Si al cambiar de anio el mes elegido queda en el futuro, se baja al mes actual.
watch(year, () => {
  if (isFutureMonth(monthIndex.value)) monthIndex.value = currentMonthIndex
})

const previousPeriod = computed(() => previousMonth(year.value, monthIndex.value))
const previousEndBalance = computed<number | null>(() => {
  if (!sourceId.value) return null
  const { year: prevYear, monthIndex: prevMonth } = previousPeriod.value
  return endBalanceOf(sourceId.value, periodKey(prevYear, prevMonth))
})
const canUsePreviousBalance = computed(
  () =>
    previousEndBalance.value !== null &&
    amountOrNull(startBalance.value) !== previousEndBalance.value,
)

function usePreviousBalance() {
  if (previousEndBalance.value !== null) {
    startBalance.value = toAmountInput(previousEndBalance.value)
  }
}

const interestDisplay = computed({
  get: () =>
    mode.value === 'manual' ? manualInterest.value : inputOrEmpty(computedInterest.value),
  set: (value: string) => {
    manualInterest.value = value
  },
})
const interestValue = computed(() => amountOrNull(interestDisplay.value))

// En manual, si los saldos no cuadran con el interes digitado se avisa (sin bloquear).
const manualMismatch = computed(
  () =>
    mode.value === 'manual' &&
    computedInterest.value !== null &&
    interestValue.value !== null &&
    interestValue.value !== computedInterest.value,
)

// Al pasar a manual se parte del valor calculado (si lo hay) en vez de un campo vacio.
watch(mode, (newMode) => {
  if (newMode === 'manual' && !manualInterest.value && computedInterest.value !== null) {
    manualInterest.value = toAmountInput(computedInterest.value)
  }
})

function resetAmounts() {
  deposits.value = '0'
  withdrawals.value = '0'
  startBalance.value = ''
  endBalance.value = ''
  manualInterest.value = ''
  tagIds.value = []
  note.value = ''
}

async function handleSubmit() {
  error.value = null
  saved.value = false

  if (!sourceId.value) {
    error.value = 'Select an income source.'
    return
  }
  if (!subcategoryId.value) {
    error.value = 'Select a subcategory.'
    return
  }
  if (mode.value === 'automatic' && computedInterest.value === null) {
    error.value = 'Start and end balances are required to compute the interest.'
    return
  }
  if (interestValue.value === null) {
    error.value = 'Enter the interest amount.'
    return
  }

  const period = periodKey(year.value, monthIndex.value)
  const payload = {
    amount: interestValue.value,
    recorded_on: `${period}-01`,
    start_of_month_amount: amountOrNull(startBalance.value),
    end_of_month_amount: amountOrNull(endBalance.value),
    deposits_amount: amountOrZero(deposits.value),
    withdrawals_amount: amountOrZero(withdrawals.value),
    note: note.value.trim() || null,
    source_id: sourceId.value,
    subcategory_id: subcategoryId.value,
    tag_ids: tagIds.value,
  }
  submitting.value = true
  try {
    const previous = props.record
    const result = previous
      ? await updateInterestIncome(previous.id, payload)
      : await createInterestIncome(payload)

    // Cache de saldos finales al dia, sin volver a pedir las opciones.
    if (previous) setEndBalance(previous.source.id, previous.recorded_on.slice(0, 7), null)
    setEndBalance(result.source.id, result.recorded_on.slice(0, 7), result.end_of_month_amount)

    emit('saved', result)
    if (!previous) {
      saved.value = true
      resetAmounts()
    }
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not save this interest record.'
  } finally {
    submitting.value = false
  }
}

onMounted(ensureLoaded)

onDeactivated(() => {
  saved.value = false
  error.value = null
})

const modes: { id: EntryMode; label: string }[] = [
  { id: 'automatic', label: 'Automatic' },
  { id: 'manual', label: 'Manual' },
]
</script>

<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <!-- Fila 1: que producto, que mes y como se obtiene el interes. -->
    <div class="flex flex-wrap items-end gap-6">
      <label class="text-sm">
        <span class="mb-1 block text-muted">Source *</span>
        <select
          v-model="sourceId"
          data-test="interest-source"
          class="w-48 rounded-lg border border-subtle bg-surface px-2 py-1.5 text-sm"
        >
          <option v-for="source in sources" :key="source.id" :value="source.id">
            {{ source.name }}
          </option>
        </select>
      </label>

      <div class="text-sm">
        <span class="mb-1 block text-muted">Period *</span>
        <div class="flex gap-1">
          <select
            v-model.number="monthIndex"
            data-test="interest-month"
            class="w-32 rounded-lg border border-subtle bg-surface px-2 py-1.5 text-sm"
          >
            <option
              v-for="(name, index) in MONTH_NAMES_EN"
              :key="name"
              :value="index"
              :disabled="isFutureMonth(index)"
            >
              {{ name }}
            </option>
          </select>
          <select
            v-model.number="year"
            data-test="interest-year"
            class="w-20 rounded-lg border border-subtle bg-surface px-2 py-1.5 text-sm"
          >
            <option v-for="option in yearOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </div>
      </div>

      <div class="text-sm">
        <span class="mb-1 block text-muted">Interest entry</span>
        <div class="flex rounded-lg border border-subtle p-0.5">
          <button
            v-for="option in modes"
            :key="option.id"
            type="button"
            :data-test="`mode-${option.id}`"
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            :class="
              mode === option.id
                ? 'bg-accent/20 text-accent-text'
                : 'text-muted hover:text-foreground'
            "
            @click="mode = option.id"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="text-sm">
      <span class="mb-1 block text-muted">Subcategory *</span>
      <p v-if="sourceId && !subcategories.length" class="py-1.5 text-xs text-muted">
        This source has no subcategories.
      </p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="subcategory in subcategories"
          :key="subcategory.id"
          type="button"
          :data-test="`subcategory-${subcategory.id}`"
          class="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
          :class="
            subcategoryId === subcategory.id
              ? 'border-accent bg-accent/10 text-accent-text'
              : 'border-subtle text-muted hover:border-accent-text/50'
          "
          @click="subcategoryId = subcategory.id"
        >
          {{ subcategory.name }}
        </button>
      </div>
    </div>

    <!--
      Conciliacion del mes, leida de arriba a abajo:
      saldo inicial + aportes - retiros + interes = saldo final.
      Cada fila: etiqueta de ancho fijo + input angosto (montos, no texto libre).
    -->
    <div class="space-y-2 text-sm">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span class="w-36 text-muted"> Start of month{{ mode === 'automatic' ? ' *' : '' }} </span>
        <CopAmountInput
          v-model="startBalance"
          data-test="start-balance"
          placeholder="3.000.000"
          class="w-40"
        />
        <button
          v-if="canUsePreviousBalance"
          type="button"
          data-test="use-previous-balance"
          class="rounded-md border border-dashed border-accent-text/40 px-2 py-1 text-xs text-accent-text hover:bg-accent/10"
          @click="usePreviousBalance"
        >
          Use {{ MONTH_NAMES_EN[previousPeriod.monthIndex] }} balance:
          {{ formatCOP(previousEndBalance!) }}
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-x-3">
        <span class="w-36 text-muted"><span class="inline-block w-3">+</span>Deposits</span>
        <CopAmountInput v-model="deposits" data-test="deposits" class="w-40" />
      </div>

      <div class="flex flex-wrap items-center gap-x-3">
        <span class="w-36 text-muted"><span class="inline-block w-3">−</span>Withdrawals</span>
        <CopAmountInput v-model="withdrawals" data-test="withdrawals" class="w-40" />
      </div>

      <div class="flex flex-wrap items-center gap-x-3">
        <span class="w-36 text-muted">End of month{{ mode === 'automatic' ? ' *' : '' }}</span>
        <CopAmountInput
          v-model="endBalance"
          data-test="end-balance"
          placeholder="3.050.000"
          class="w-40"
        />
      </div>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-subtle pt-2">
        <span class="w-36 font-medium text-foreground">
          Interest earned{{ mode === 'manual' ? ' *' : '' }}
        </span>
        <CopAmountInput
          v-model="interestDisplay"
          data-test="interest-value"
          :readonly="mode === 'automatic'"
          allow-negative
          :placeholder="mode === 'automatic' ? '—' : '0'"
          class="w-40 font-medium"
          :class="
            interestValue === null ? '' : interestValue < 0 ? 'text-ruby-text' : 'text-success-text'
          "
        />
        <span v-if="mode === 'automatic'" class="text-xs text-muted">
          = end − start − deposits + withdrawals
        </span>
        <span v-else-if="manualMismatch" class="text-xs text-muted">
          Balances suggest {{ formatCOP(computedInterest!) }}
        </span>
      </div>
    </div>

    <CollapsibleNote v-model="note" />

    <TagPicker v-model="tagIds" :tags="tagOptions" />

    <div class="flex items-center gap-3" :class="isEdit && 'flex-row-reverse'">
      <BaseButton type="submit" :disabled="submitting">
        {{ submitting ? 'Saving...' : 'Save' }}
      </BaseButton>
      <BaseButton
        v-if="isEdit"
        variant="secondary"
        type="button"
        :disabled="submitting"
        @click="emit('cancel')"
      >
        Cancel
      </BaseButton>
      <span v-if="saved" class="text-sm text-accent-text">Saved.</span>
      <span v-if="error" class="text-sm text-ruby-text" :class="isEdit && 'mr-auto'">
        {{ error }}
      </span>
    </div>
  </form>
</template>
