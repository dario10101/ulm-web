<script setup lang="ts">
import { X } from '@lucide/vue'
import { onDeactivated, onMounted, ref } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useExpenseOptions } from '@/composables/useExpenseOptions'
import { financeColorClasses, financeIcon } from '@/config/financeVisuals'
import { formatThousandsInput, parseThousandsInput } from '@/lib/currency'
import { todayIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { createExpense } from '@/services/expensesApi'

// Formulario de gasto: end-to-end real contra la API (ver expensesApi).
// Categoria y metodo de pago no tienen valor por defecto: el usuario tiene
// que elegir uno a proposito. Los tags son multi-seleccion (expenseTagIds).
const {
  categories: expenseCategories,
  paymentMethods: expensePaymentMethods,
  tags: expenseTagChoices,
  ensureLoaded: ensureExpenseOptionsLoaded,
} = useExpenseOptions()
const expenseName = ref('')
const expenseValue = ref('')
const expenseDate = ref(todayIsoDate())
const expensePaymentMethodId = ref<number | null>(null)
const expenseCategoryId = ref<number | null>(null)
const expenseTagIds = ref<number[]>([])
const expenseNoteOpen = ref(false)
const expenseNote = ref('')
const expenseSubmitting = ref(false)
const expenseError = ref<string | null>(null)
const expenseSaved = ref(false)

// Formatea el monto con "." como separador de miles a medida que se escribe
// (ej. 10345456 -> 10.345.456). Solo parte entera: COP no maneja decimales aqui.
function onExpenseAmountInput(event: Event) {
  expenseValue.value = formatThousandsInput((event.target as HTMLInputElement).value)
}

function toggleExpenseTag(tagId: number) {
  expenseTagIds.value = expenseTagIds.value.includes(tagId)
    ? expenseTagIds.value.filter((id) => id !== tagId)
    : [...expenseTagIds.value, tagId]
}

function openExpenseNote() {
  expenseNoteOpen.value = true
}

function closeExpenseNote() {
  expenseNoteOpen.value = false
  expenseNote.value = ''
}

async function handleExpenseSubmit() {
  expenseError.value = null

  const name = expenseName.value.trim()
  if (!name) {
    expenseError.value = 'Name is required.'
    return
  }
  const parsedValue = parseThousandsInput(expenseValue.value)
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    expenseError.value = 'Enter a valid amount greater than 0.'
    return
  }
  if (!expenseDate.value) {
    expenseError.value = 'Date is required.'
    return
  }
  if (!expensePaymentMethodId.value) {
    expenseError.value = 'Select a payment method.'
    return
  }
  if (!expenseCategoryId.value) {
    expenseError.value = 'Select a category.'
    return
  }

  expenseSubmitting.value = true
  try {
    await createExpense({
      name,
      amount: parsedValue,
      recorded_on: expenseDate.value,
      note: expenseNote.value.trim() || null,
      payment_method_id: expensePaymentMethodId.value,
      category_id: expenseCategoryId.value,
      tag_ids: expenseTagIds.value,
    })
    expenseSaved.value = true
    expenseName.value = ''
    expenseValue.value = ''
    expensePaymentMethodId.value = null
    expenseCategoryId.value = null
    expenseTagIds.value = []
    closeExpenseNote()
  } catch (err) {
    expenseError.value = err instanceof ApiError ? err.message : 'Could not save this expense.'
  } finally {
    expenseSubmitting.value = false
  }
}

onMounted(ensureExpenseOptionsLoaded)

// La pagina envuelve los forms en KeepAlive: el borrador sobrevive al cambiar
// de tipo, pero el feedback del ultimo envio no debe reaparecer al volver.
onDeactivated(() => {
  expenseSaved.value = false
  expenseError.value = null
})
</script>

<template>
  <BaseCard title="New expense">
    <form class="space-y-5" @submit.prevent="handleExpenseSubmit">
      <!-- Fila 1: name, amount y date, lado a lado y compactas. -->
      <div class="flex flex-wrap items-end gap-6">
        <label class="text-sm">
          <span class="mb-1 block text-muted">Name *</span>
          <input
            v-model="expenseName"
            type="text"
            placeholder="e.g. Weekly groceries"
            maxlength="200"
            required
            class="w-44 rounded-lg border border-subtle bg-surface px-2 py-1.5 text-sm"
          />
        </label>

        <label class="text-sm">
          <span class="mb-1 block text-muted">Amount (COP) *</span>
          <div
            class="flex w-36 items-center gap-1 rounded-lg border border-subtle bg-surface px-2 py-1.5 text-sm focus-within:border-accent-text/50"
          >
            <span class="text-muted">$</span>
            <input
              :value="expenseValue"
              type="text"
              inputmode="numeric"
              placeholder="25.000"
              required
              class="w-full bg-transparent outline-none"
              @input="onExpenseAmountInput"
            />
          </div>
        </label>

        <label class="text-sm">
          <span class="mb-1 block text-muted">Date *</span>
          <input
            v-model="expenseDate"
            type="date"
            required
            class="w-36 rounded-lg border border-subtle bg-surface px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <!-- Fila 2: payment method, en su propia fila. -->
      <div class="text-sm">
        <span class="mb-1 block text-muted">Payment method *</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="method in expensePaymentMethods"
            :key="method.id"
            type="button"
            :title="method.name"
            class="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors"
            :class="
              expensePaymentMethodId === method.id
                ? 'border-accent bg-accent/10 text-accent-text'
                : 'border-subtle text-muted hover:border-accent-text/50'
            "
            @click="expensePaymentMethodId = method.id"
          >
            <span
              class="flex h-5 w-5 items-center justify-center rounded-md"
              :class="financeColorClasses(method.color_key).bg"
            >
              <component
                :is="financeIcon(method.icon_key)"
                class="h-3.5 w-3.5"
                :class="financeColorClasses(method.color_key).text"
              />
            </span>
            {{ method.name }}
          </button>
        </div>
      </div>

      <!-- Fila 3: categoria, siempre en su propia fila (22 opciones no caben con el resto). -->
      <div class="text-sm">
        <span class="mb-2 block text-muted">Category *</span>
        <div class="grid grid-cols-3 gap-1.5 sm:grid-cols-5 md:grid-cols-6">
          <button
            v-for="category in expenseCategories"
            :key="category.id"
            type="button"
            class="flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-xs font-medium transition-colors"
            :class="
              expenseCategoryId === category.id
                ? 'border-accent bg-accent/10 text-accent-text'
                : 'border-subtle text-muted hover:border-accent-text/50'
            "
            @click="expenseCategoryId = category.id"
          >
            <span
              class="flex h-6 w-6 items-center justify-center rounded-md"
              :class="financeColorClasses(category.color_key).bg"
            >
              <component
                :is="financeIcon(category.icon_key)"
                class="h-3.5 w-3.5"
                :class="financeColorClasses(category.color_key).text"
              />
            </span>
            <span class="leading-tight">{{ category.name }}</span>
          </button>
        </div>
      </div>

      <!-- Nota opcional: colapsada por defecto para no ocupar espacio. -->
      <div class="text-sm">
        <button
          v-if="!expenseNoteOpen"
          type="button"
          class="text-xs font-medium text-accent-text hover:underline"
          @click="openExpenseNote"
        >
          + Add note
        </button>
        <div v-else>
          <div class="mb-1 flex items-center justify-between">
            <span class="text-muted">Note (optional)</span>
            <button
              type="button"
              title="Remove note"
              class="rounded-md p-0.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
              @click="closeExpenseNote"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>
          <textarea
            v-model="expenseNote"
            rows="2"
            class="w-full max-w-md rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
          />
        </div>
      </div>

      <!-- Tags al final: multi-seleccion, el chip se colorea/descolorea al toggle. -->
      <div class="text-sm">
        <span class="mb-2 block text-muted">Tags (optional)</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="tag in expenseTagChoices"
            :key="tag.id"
            type="button"
            class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
            :class="
              expenseTagIds.includes(tag.id)
                ? [
                    financeColorClasses(tag.color_key).bg,
                    financeColorClasses(tag.color_key).text,
                    financeColorClasses(tag.color_key).border,
                  ]
                : 'border-subtle text-muted hover:border-accent-text/50'
            "
            @click="toggleExpenseTag(tag.id)"
          >
            {{ tag.name }}
          </button>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <BaseButton type="submit" :disabled="expenseSubmitting">
          {{ expenseSubmitting ? 'Saving...' : 'Save' }}
        </BaseButton>
        <span v-if="expenseSaved" class="text-sm text-accent-text">Saved.</span>
        <span v-if="expenseError" class="text-sm text-ruby-text">{{ expenseError }}</span>
      </div>
    </form>
  </BaseCard>
</template>
