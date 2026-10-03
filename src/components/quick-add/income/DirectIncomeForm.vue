<script setup lang="ts">
import { computed, onDeactivated, onMounted, ref, watch } from 'vue'

import TagPicker from '@/components/finance/TagPicker.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CollapsibleNote from '@/components/ui/CollapsibleNote.vue'
import CopAmountInput from '@/components/ui/CopAmountInput.vue'
import { useIncomeOptions } from '@/composables/useIncomeOptions'
import { parseAmountInput, toAmountInput } from '@/lib/currency'
import { MONTH_NAMES_EN, moveToMonth, parseIsoDate, todayIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { createDirectIncome, updateDirectIncome } from '@/services/incomesApi'
import type { DirectIncome } from '@/types/income'

// Ingreso directo (salario, venta ocasional...): un registro por dia.
// Sin `record` es el alta de "Add record"; con `record` edita ese registro
// (lo usa el dialogo de "View records").
const props = withDefaults(defineProps<{ record?: DirectIncome | null }>(), { record: null })
const emit = defineEmits<{ saved: [record: DirectIncome]; cancel: [] }>()

const { tags, ensureLoaded, sourcesFor, subcategoriesOf } = useIncomeOptions()
const sources = sourcesFor('direct')
const isEdit = computed(() => props.record !== null)

const amount = ref('')
const sourceId = ref<number | null>(null)
const subcategoryId = ref<number | null>(null)
// Cada subcategoria pertenece a una fuente: se ofrecen solo las de la elegida.
const subcategories = subcategoriesOf(sourceId)
const date = ref(todayIsoDate())
const tagIds = ref<number[]>([])
const note = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)
const saved = ref(false)

watch(
  () => props.record,
  (record) => {
    if (!record) return
    amount.value = toAmountInput(record.amount)
    sourceId.value = record.source.id
    subcategoryId.value = record.subcategory.id
    date.value = record.recorded_on
    tagIds.value = record.tags.map((tag) => tag.id)
    note.value = record.note ?? ''
    error.value = null
  },
  { immediate: true },
)

// Al cambiar de fuente (o al llegar las opciones, que son async) la
// subcategoria pasa a la primera de esa fuente (ej. "SALARIO BASE"), salvo
// que la elegida siga perteneciendo a ella (ej. al abrir un registro a editar).
watch(
  subcategories,
  (list) => {
    // Sin opciones cargadas todavia no se toca: borraria la del registro en edicion.
    if (!sources.value.length) return
    if (!list.some((s) => s.id === subcategoryId.value)) subcategoryId.value = list[0]?.id ?? null
  },
  { immediate: true },
)

// El mes no es estado propio: se deriva de la fecha para que nunca se desincronicen.
const monthIndex = computed({
  get: () => (date.value ? parseIsoDate(date.value).getMonth() : new Date().getMonth()),
  set: (newMonth: number) => {
    date.value = moveToMonth(date.value || todayIsoDate(), newMonth)
  },
})

async function handleSubmit() {
  error.value = null
  saved.value = false

  const parsedAmount = parseAmountInput(amount.value)
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    error.value = 'Enter a valid amount greater than 0.'
    return
  }
  if (!sourceId.value) {
    error.value = 'Select an income source.'
    return
  }
  if (!subcategoryId.value) {
    error.value = 'Select a subcategory.'
    return
  }
  if (!date.value) {
    error.value = 'Date is required.'
    return
  }

  const payload = {
    amount: parsedAmount,
    recorded_on: date.value,
    note: note.value.trim() || null,
    source_id: sourceId.value,
    subcategory_id: subcategoryId.value,
    tag_ids: tagIds.value,
  }
  submitting.value = true
  try {
    const result = props.record
      ? await updateDirectIncome(props.record.id, payload)
      : await createDirectIncome(payload)
    emit('saved', result)
    if (!props.record) {
      // Fuente, subcategoria y fecha se conservan: lo comun es registrar
      // varios ingresos parecidos seguidos (ej. las dos quincenas).
      saved.value = true
      amount.value = ''
      tagIds.value = []
      note.value = ''
    }
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not save this income.'
  } finally {
    submitting.value = false
  }
}

onMounted(ensureLoaded)

onDeactivated(() => {
  saved.value = false
  error.value = null
})
</script>

<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <!-- Fila 1: monto + cuando (fecha y su mes, agrupados porque se afectan entre si). -->
    <div class="flex flex-wrap items-end gap-6">
      <label class="text-sm">
        <span class="mb-1 block text-muted">Amount (COP) *</span>
        <CopAmountInput
          v-model="amount"
          data-test="direct-amount"
          placeholder="3.500.000"
          class="w-40"
        />
      </label>

      <div class="flex items-end gap-2">
        <label class="text-sm">
          <span class="mb-1 block text-muted">Date *</span>
          <input
            v-model="date"
            type="date"
            required
            class="w-36 rounded-lg border border-subtle bg-surface px-2 py-1.5 text-sm"
          />
        </label>
        <label class="text-sm">
          <span class="mb-1 block text-muted">Month</span>
          <select
            v-model.number="monthIndex"
            data-test="direct-month"
            class="w-32 rounded-lg border border-subtle bg-surface px-2 py-1.5 text-sm"
          >
            <option v-for="(name, index) in MONTH_NAMES_EN" :key="name" :value="index">
              {{ name }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <!-- Fila 2: de donde viene y que tipo de ingreso es. -->
    <div class="flex flex-wrap items-end gap-6">
      <label class="text-sm">
        <span class="mb-1 block text-muted">Source *</span>
        <select
          v-model="sourceId"
          data-test="direct-source"
          class="w-48 rounded-lg border border-subtle bg-surface px-2 py-1.5 text-sm"
          :class="sourceId ? '' : 'text-muted'"
        >
          <option :value="null" disabled>Select a source</option>
          <option v-for="source in sources" :key="source.id" :value="source.id">
            {{ source.name }}
          </option>
        </select>
      </label>

      <div class="text-sm">
        <span class="mb-1 block text-muted">Subcategory *</span>
        <p v-if="!sourceId" class="py-1.5 text-xs text-muted">Select a source first.</p>
        <p v-else-if="!subcategories.length" class="py-1.5 text-xs text-muted">
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
    </div>

    <CollapsibleNote v-model="note" />

    <TagPicker v-model="tagIds" :tags="tags" />

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
