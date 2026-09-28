<script setup lang="ts">
import { X } from '@lucide/vue'
import { onMounted, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useExpenseOptions } from '@/composables/useExpenseOptions'
import { financeColorClasses, financeIcon } from '@/config/financeVisuals'
import { formatThousands, formatThousandsInput, parseThousandsInput } from '@/lib/currency'
import { ApiError } from '@/lib/http'
import { updateExpense } from '@/services/expensesApi'
import type { Expense } from '@/types/expense'

/** Edicion de un registro de gasto ya existente (mismos campos que el alta
 * en ExpenseForm.vue, ver ese archivo para el mismo patron de UI). */
const props = defineProps<{ record: Expense | null }>()

const emit = defineEmits<{ close: []; saved: [] }>()

const {
  categories: expenseCategories,
  paymentMethods: expensePaymentMethods,
  tags: expenseTagChoices,
  ensureLoaded: ensureExpenseOptionsLoaded,
} = useExpenseOptions()

const expenseName = ref('')
const expenseValue = ref('')
const expenseDate = ref('')
const expensePaymentMethodId = ref<number | null>(null)
const expenseCategoryId = ref<number | null>(null)
const expenseTagIds = ref<number[]>([])
const expenseNoteOpen = ref(false)
const expenseNote = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.record,
  (record) => {
    error.value = null
    if (!record) return

    expenseName.value = record.name
    expenseValue.value = formatThousands(String(Math.round(record.amount)))
    expenseDate.value = record.recorded_on
    expensePaymentMethodId.value = record.payment_method.id
    expenseCategoryId.value = record.category.id
    expenseTagIds.value = record.tags.map((tag) => tag.id)
    expenseNoteOpen.value = Boolean(record.note)
    expenseNote.value = record.note ?? ''
  },
  { immediate: true },
)

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

async function submit() {
  if (!props.record) return
  error.value = null

  const name = expenseName.value.trim()
  if (!name) {
    error.value = 'Name is required.'
    return
  }
  const parsedValue = parseThousandsInput(expenseValue.value)
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    error.value = 'Enter a valid amount greater than 0.'
    return
  }
  if (!expenseDate.value) {
    error.value = 'Date is required.'
    return
  }
  if (!expensePaymentMethodId.value) {
    error.value = 'Select a payment method.'
    return
  }
  if (!expenseCategoryId.value) {
    error.value = 'Select a category.'
    return
  }

  saving.value = true
  try {
    await updateExpense(props.record.id, {
      name,
      amount: parsedValue,
      recorded_on: expenseDate.value,
      note: expenseNote.value.trim() || null,
      payment_method_id: expensePaymentMethodId.value,
      category_id: expenseCategoryId.value,
      tag_ids: expenseTagIds.value,
    })
    emit('saved')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not save this expense.'
  } finally {
    saving.value = false
  }
}

onMounted(ensureExpenseOptionsLoaded)
</script>

<template>
  <div
    v-if="record"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
    @click.self="emit('close')"
  >
    <form
      class="max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-xl border border-subtle bg-surface p-5"
      @submit.prevent="submit"
    >
      <h3 class="text-sm font-semibold text-foreground">Edit expense</h3>

      <div class="flex flex-wrap items-end gap-6">
        <label class="text-sm">
          <span class="mb-1 block text-muted">Name *</span>
          <input
            v-model="expenseName"
            type="text"
            maxlength="200"
            required
            class="w-44 rounded-lg border border-subtle bg-background px-2 py-1.5 text-sm"
          />
        </label>

        <label class="text-sm">
          <span class="mb-1 block text-muted">Amount (COP) *</span>
          <div
            class="flex w-36 items-center gap-1 rounded-lg border border-subtle bg-background px-2 py-1.5 text-sm focus-within:border-accent-text/50"
          >
            <span class="text-muted">$</span>
            <input
              :value="expenseValue"
              type="text"
              inputmode="numeric"
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
            class="w-36 rounded-lg border border-subtle bg-background px-2 py-1.5 text-sm"
          />
        </label>
      </div>

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
            class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

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
