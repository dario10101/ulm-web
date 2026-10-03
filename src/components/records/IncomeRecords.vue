<script setup lang="ts">
import { Pencil, Trash2, TrendingUp } from '@lucide/vue'
import { onMounted, reactive, ref, watch } from 'vue'

import TagListPopover from '@/components/finance/TagListPopover.vue'
import IncomeFilterBar from '@/components/income/IncomeFilterBar.vue'
import DirectIncomeForm from '@/components/quick-add/income/DirectIncomeForm.vue'
import InterestIncomeForm from '@/components/quick-add/income/InterestIncomeForm.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useIncomeOptions } from '@/composables/useIncomeOptions'
import { formatCOP } from '@/lib/currency'
import { MONTH_SHORT_EN, parseIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import {
  defaultIncomeFilters,
  incomeFilterQuery,
  type IncomeFilterState,
} from '@/lib/incomeFilters'
import { deleteIncome, listIncomes } from '@/services/incomesApi'
import type { DirectIncome, IncomeKind, IncomePage, InterestIncome } from '@/types/income'

// "View records -> Income": mismo esquema que gastos (barra de filtros +
// tabla paginada + editar/borrar), con un selector Direct/Interest porque
// son dos tablas con columnas distintas. Cada tipo guarda sus propios
// filtros y pagina, y se carga la primera vez que se abre.
const PAGE_SIZE = 10

const { ensureLoaded, setEndBalance } = useIncomeOptions()

const kind = ref<IncomeKind>('direct')
const filters = reactive<Record<IncomeKind, IncomeFilterState>>({
  direct: defaultIncomeFilters(),
  interest: defaultIncomeFilters(),
})
const pageNum = reactive<Record<IncomeKind, number>>({ direct: 1, interest: 1 })
const directPage = ref<IncomePage<DirectIncome> | null>(null)
const interestPage = ref<IncomePage<InterestIncome> | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function fetchPage(target: IncomeKind = kind.value) {
  loading.value = true
  error.value = null
  const params = {
    ...incomeFilterQuery(filters[target]),
    page: pageNum[target],
    pageSize: PAGE_SIZE,
  }
  try {
    if (target === 'direct') directPage.value = await listIncomes('direct', params)
    else interestPage.value = await listIncomes('interest', params)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not load incomes.'
  } finally {
    loading.value = false
  }
}

function currentPage() {
  return kind.value === 'direct' ? directPage.value : interestPage.value
}

watch(kind, (value) => {
  const loaded = value === 'direct' ? directPage.value : interestPage.value
  if (loaded === null) fetchPage(value)
})

function onFiltersChange(target: IncomeKind, value: IncomeFilterState) {
  filters[target] = value
  pageNum[target] = 1
  fetchPage(target)
}

function goToPage(newPage: number) {
  pageNum[kind.value] = newPage
  fetchPage()
}

function formatPeriod(isoDate: string): string {
  const date = parseIsoDate(isoDate)
  return `${MONTH_SHORT_EN[date.getMonth()]} ${date.getFullYear()}`
}

function optionalCOP(amount: number | null): string {
  return amount === null ? '—' : formatCOP(amount)
}

// --- Edicion ---

const editingDirect = ref<DirectIncome | null>(null)
const editingInterest = ref<InterestIncome | null>(null)

function closeEdit() {
  editingDirect.value = null
  editingInterest.value = null
}

async function onEdited() {
  closeEdit()
  await fetchPage()
}

// --- Borrado ---

type DeletingRecord =
  { kind: 'direct'; record: DirectIncome } | { kind: 'interest'; record: InterestIncome }

const deleting = ref<DeletingRecord | null>(null)
const deleteSaving = ref(false)
const deleteError = ref<string | null>(null)

function askDelete(target: DeletingRecord) {
  deleting.value = target
  deleteError.value = null
}

async function confirmDelete() {
  if (!deleting.value) return
  const target = deleting.value
  deleteSaving.value = true
  deleteError.value = null
  try {
    await deleteIncome(target.kind, target.record.id)
    if (target.kind === 'interest') {
      setEndBalance(target.record.source.id, target.record.recorded_on.slice(0, 7), null)
    }
    deleting.value = null
    // Si se borro el unico registro de la ultima pagina, retroceder una.
    if (currentPage()?.items.length === 1 && pageNum[target.kind] > 1) pageNum[target.kind] -= 1
    await fetchPage(target.kind)
  } catch (err) {
    deleteError.value = err instanceof ApiError ? err.message : 'Could not delete this record.'
  } finally {
    deleteSaving.value = false
  }
}

onMounted(() => {
  ensureLoaded()
  fetchPage('direct')
})

const kinds: { id: IncomeKind; label: string }[] = [
  { id: 'direct', label: 'Direct' },
  { id: 'interest', label: 'Interest' },
]
const ACTION_BUTTON = 'rounded-md p-1.5 text-muted hover:bg-surface-hover'
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex rounded-lg border border-subtle p-0.5">
        <button
          v-for="option in kinds"
          :key="option.id"
          type="button"
          :data-test="`records-income-${option.id}`"
          class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
          :class="
            kind === option.id
              ? 'bg-accent/20 text-accent-text'
              : 'text-muted hover:text-foreground'
          "
          @click="kind = option.id"
        >
          {{ option.label }}
        </button>
      </div>
      <IncomeFilterBar
        :key="kind"
        :kind="kind"
        :model-value="filters[kind]"
        @update:model-value="(value) => onFiltersChange(kind, value)"
      />
    </div>

    <BaseCard>
      <p v-if="loading" class="py-6 text-center text-sm text-muted">Loading...</p>
      <p v-else-if="error" class="py-6 text-center text-sm text-ruby-text">{{ error }}</p>
      <EmptyState
        v-else-if="!currentPage()?.items.length"
        :icon="TrendingUp"
        :title="kind === 'direct' ? 'No incomes yet' : 'No interest records yet'"
        description="Log one from Add record and it'll show up here."
      />

      <!-- Directos -->
      <table
        v-else-if="kind === 'direct' && directPage"
        class="w-full table-fixed text-left text-sm"
      >
        <colgroup>
          <col class="w-24" />
          <col class="w-40" />
          <col class="w-32" />
          <col class="w-32" />
          <col class="w-16" />
          <col />
          <col class="w-20" />
        </colgroup>
        <thead>
          <tr class="text-muted">
            <th class="pb-2 font-medium">Date</th>
            <th class="pb-2 font-medium">Source</th>
            <th class="pb-2 font-medium">Subcategory</th>
            <th class="pb-2 font-medium">Amount</th>
            <th class="pb-2 font-medium">Tags</th>
            <th class="pb-2 font-medium">Note</th>
            <th class="pb-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-subtle">
          <tr v-for="item in directPage.items" :key="item.id">
            <td class="whitespace-nowrap py-2 text-foreground">{{ item.recorded_on }}</td>
            <td class="py-2 text-foreground">
              <span class="block truncate" :title="item.source.name">{{ item.source.name }}</span>
            </td>
            <td class="py-2 text-muted">
              <span class="block truncate" :title="item.subcategory.name">
                {{ item.subcategory.name }}
              </span>
            </td>
            <td class="whitespace-nowrap py-2 text-success-text">{{ formatCOP(item.amount) }}</td>
            <td class="py-2"><TagListPopover :tags="item.tags" /></td>
            <td class="py-2 text-muted">
              <span class="block truncate" :title="item.note ?? undefined">
                {{ item.note ?? '—' }}
              </span>
            </td>
            <td class="whitespace-nowrap py-2 text-right">
              <button
                type="button"
                title="Edit record"
                :class="[ACTION_BUTTON, 'hover:text-foreground']"
                @click="editingDirect = item"
              >
                <Pencil class="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Delete record"
                :class="[ACTION_BUTTON, 'hover:text-ruby-text']"
                @click="askDelete({ kind: 'direct', record: item })"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Intereses: mas columnas (la conciliacion del mes), con scroll horizontal en pantallas chicas -->
      <div v-else-if="kind === 'interest' && interestPage" class="overflow-x-auto">
        <table class="w-full min-w-[60rem] table-fixed text-left text-sm">
          <colgroup>
            <col class="w-20" />
            <col class="w-36" />
            <col class="w-28" />
            <col class="w-28" />
            <col class="w-24" />
            <col class="w-24" />
            <col class="w-28" />
            <col class="w-28" />
            <col class="w-14" />
            <col />
            <col class="w-20" />
          </colgroup>
          <thead>
            <tr class="text-muted">
              <th class="pb-2 font-medium">Period</th>
              <th class="pb-2 font-medium">Source</th>
              <th class="pb-2 font-medium">Subcategory</th>
              <th class="pb-2 font-medium">Start</th>
              <th class="pb-2 font-medium">+ Deposits</th>
              <th class="pb-2 font-medium">− Withdr.</th>
              <th class="pb-2 font-medium">End</th>
              <th class="pb-2 font-medium">Interest</th>
              <th class="pb-2 font-medium">Tags</th>
              <th class="pb-2 font-medium">Note</th>
              <th class="pb-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-subtle">
            <tr v-for="item in interestPage.items" :key="item.id" class="tabular-nums">
              <td class="whitespace-nowrap py-2 text-foreground">
                {{ formatPeriod(item.recorded_on) }}
              </td>
              <td class="py-2 text-foreground">
                <span class="block truncate" :title="item.source.name">{{ item.source.name }}</span>
              </td>
              <td class="py-2 text-muted">
                <span class="block truncate" :title="item.subcategory.name">
                  {{ item.subcategory.name }}
                </span>
              </td>
              <td class="whitespace-nowrap py-2 text-muted">
                {{ optionalCOP(item.start_of_month_amount) }}
              </td>
              <td class="whitespace-nowrap py-2 text-muted">
                {{ item.deposits_amount ? formatCOP(item.deposits_amount) : '—' }}
              </td>
              <td class="whitespace-nowrap py-2 text-muted">
                {{ item.withdrawals_amount ? formatCOP(item.withdrawals_amount) : '—' }}
              </td>
              <td class="whitespace-nowrap py-2 text-muted">
                {{ optionalCOP(item.end_of_month_amount) }}
              </td>
              <td
                class="whitespace-nowrap py-2 font-medium"
                :class="item.amount < 0 ? 'text-ruby-text' : 'text-success-text'"
              >
                {{ formatCOP(item.amount) }}
              </td>
              <td class="py-2"><TagListPopover :tags="item.tags" /></td>
              <td class="py-2 text-muted">
                <span class="block truncate" :title="item.note ?? undefined">
                  {{ item.note ?? '—' }}
                </span>
              </td>
              <td class="whitespace-nowrap py-2 text-right">
                <button
                  type="button"
                  title="Edit record"
                  :class="[ACTION_BUTTON, 'hover:text-foreground']"
                  @click="editingInterest = item"
                >
                  <Pencil class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Delete record"
                  :class="[ACTION_BUTTON, 'hover:text-ruby-text']"
                  @click="askDelete({ kind: 'interest', record: item })"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="!loading && !error && currentPage()?.items.length"
        class="mt-4 flex items-center justify-between text-sm text-muted"
      >
        <span>
          Page {{ currentPage()!.page }} of {{ currentPage()!.total_pages || 1 }} ({{
            currentPage()!.total
          }}
          total)
        </span>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-md border border-subtle px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="pageNum[kind] <= 1"
            @click="goToPage(pageNum[kind] - 1)"
          >
            Previous
          </button>
          <button
            type="button"
            class="rounded-md border border-subtle px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="pageNum[kind] >= currentPage()!.total_pages"
            @click="goToPage(pageNum[kind] + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </BaseCard>

    <!-- Edicion: el mismo form del alta, en modo edicion (prop `record`). -->
    <div
      v-if="editingDirect || editingInterest"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeEdit"
    >
      <div
        class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-subtle bg-surface p-5"
      >
        <h3 class="mb-4 text-sm font-semibold text-foreground">
          {{ editingDirect ? 'Edit income' : 'Edit interest income' }}
        </h3>
        <DirectIncomeForm
          v-if="editingDirect"
          :record="editingDirect"
          @saved="onEdited"
          @cancel="closeEdit"
        />
        <InterestIncomeForm
          v-else
          :record="editingInterest"
          @saved="onEdited"
          @cancel="closeEdit"
        />
      </div>
    </div>

    <div
      v-if="deleting"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      @click.self="deleting = null"
    >
      <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
        <h3 class="mb-2 text-sm font-semibold text-foreground">
          Delete this {{ deleting.kind === 'direct' ? 'income' : 'interest record' }}?
        </h3>
        <p class="text-sm text-muted">
          {{ deleting.record.source.name }} · {{ formatCOP(deleting.record.amount) }} ·
          {{
            deleting.kind === 'direct'
              ? deleting.record.recorded_on
              : formatPeriod(deleting.record.recorded_on)
          }}. This can't be undone.
        </p>

        <p v-if="deleteError" class="mt-3 text-sm text-ruby-text">{{ deleteError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <BaseButton
            variant="secondary"
            type="button"
            :disabled="deleteSaving"
            @click="deleting = null"
          >
            Cancel
          </BaseButton>
          <BaseButton
            variant="primary"
            type="button"
            :disabled="deleteSaving"
            class="!bg-ruby hover:!bg-ruby/90"
            data-test="confirm-delete"
            @click="confirmDelete"
          >
            {{ deleteSaving ? 'Deleting...' : 'Delete' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
