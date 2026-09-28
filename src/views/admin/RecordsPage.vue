<script setup lang="ts">
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  ReceiptText,
  Salad,
  Scale,
  Tag,
  Trash2,
} from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ExpenseFilterBar from '@/components/expenses/ExpenseFilterBar.vue'
import ExpenseFormDialog from '@/components/records/ExpenseFormDialog.vue'
import MealFormDialog from '@/components/records/MealFormDialog.vue'
import WeightFormDialog from '@/components/records/WeightFormDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { financeColorClasses, financeIcon } from '@/config/financeVisuals'
import { mealTypeLabel } from '@/config/mealTypes'
import { recordTypes, type RecordType } from '@/config/recordTypes'
import { formatCOP } from '@/lib/currency'
import { formatShortDate, isoWeekday, parseIsoDate } from '@/lib/date'
import {
  defaultExpenseFilters,
  expenseFilterQuery,
  type ExpenseFilterState,
} from '@/lib/expenseFilters'
import { ApiError } from '@/lib/http'
import { mealScaleGradientCss, mealScalePositionPercent } from '@/lib/mealColor'
import { parseMealContent } from '@/lib/mealContent'
import { clockFromDate, parseLocalDateTime, weekdayOptions } from '@/lib/time'
import { deleteExpense, listExpenses } from '@/services/expensesApi'
import { deleteMeal, listMeals } from '@/services/mealsApi'
import { deleteWeight, listWeights } from '@/services/weightsApi'
import type { Expense, ExpensePage } from '@/types/expense'
import type { Meal } from '@/types/meal'
import type { Weight, WeightPage } from '@/types/weight'

const PAGE_SIZE = 10
const MEAL_PAGE_SIZE = 100 // tope del backend (Query le=100), ver app/api/routes/meals.py
const MEAL_BAR_WIDTH_PX = 80 // debe calzar con la clase w-20 de la barra

const DEFAULT_TYPE_ID = 'weight'

const route = useRoute()
const router = useRouter()

// El tipo activo vive en la URL. Sin param (o con uno invalido) se muestra
// "weight" y se corrige la URL, para que cada vista tenga una sola direccion.
const activeType = computed<RecordType>(
  () =>
    recordTypes.find((type) => type.id === route.params.type) ??
    recordTypes.find((type) => type.id === DEFAULT_TYPE_ID)!,
)

watch(
  () => route.params.type,
  (type) => {
    if (type !== activeType.value.id) {
      router.replace({ name: 'admin-records', params: { type: activeType.value.id } })
    }
  },
  { immediate: true },
)

const startDate = ref('')
const endDate = ref('')
const page = ref(1)

const weightPage = ref<WeightPage | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function fetchWeights() {
  loading.value = true
  error.value = null
  try {
    weightPage.value = await listWeights({
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined,
      page: page.value,
      pageSize: PAGE_SIZE,
    })
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not load weight records.'
  } finally {
    loading.value = false
  }
}

// --- Comidas: agrupadas por dia (recorded_on, no created_at), sin paginar
// (se trae todo el rango filtrado y se agrupa en el cliente). ---

interface MealDayGroup {
  dateKey: string
  date: Date
  meals: Meal[]
  totalPortion: number
}

const rawMeals = ref<Meal[]>([])
const mealsFetched = ref(false)
const mealsLoading = ref(false)
const mealsError = ref<string | null>(null)
const expandedMealDays = ref<Set<string>>(new Set())

const mealDayGroups = computed<MealDayGroup[]>(() => {
  const byDay = new Map<string, Meal[]>()
  for (const meal of rawMeals.value) {
    // recorded_on ya viene en hora local del usuario (ver mealsApi/backend).
    const dateKey = meal.recorded_on.slice(0, 10)
    const bucket = byDay.get(dateKey)
    if (bucket) bucket.push(meal)
    else byDay.set(dateKey, [meal])
  }
  return Array.from(byDay.entries())
    .map(([dateKey, meals]) => ({
      dateKey,
      date: parseIsoDate(dateKey),
      meals: [...meals].sort((a, b) => a.recorded_on.localeCompare(b.recorded_on)),
      totalPortion: meals.reduce((sum, m) => sum + m.meal_size, 0),
    }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
})

async function fetchMeals() {
  mealsLoading.value = true
  mealsError.value = null
  try {
    const result = await listMeals({
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined,
      page: 1,
      pageSize: MEAL_PAGE_SIZE,
    })
    rawMeals.value = result.items
    mealsFetched.value = true
  } catch (err) {
    mealsError.value = err instanceof ApiError ? err.message : 'Could not load meal records.'
  } finally {
    mealsLoading.value = false
  }
}

function toggleMealDay(dateKey: string) {
  const next = new Set(expandedMealDays.value)
  if (next.has(dateKey)) next.delete(dateKey)
  else next.add(dateKey)
  expandedMealDays.value = next
}

function formatMealTime(meal: Meal): string {
  const clock = clockFromDate(parseLocalDateTime(meal.recorded_on))
  return `${clock.hour}:${String(clock.minute).padStart(2, '0')} ${clock.ampm}`
}

function weekdayLabel(date: Date): string {
  return weekdayOptions.find((day) => day.value === isoWeekday(date))?.label ?? ''
}

// --- Gastos ---

// Filtros en un solo objeto inmutable (ver lib/expenseFilters.ts): la barra
// emite uno nuevo en cada cambio y aca solo se vuelve a pedir la lista.
const expenseFilters = ref<ExpenseFilterState>(defaultExpenseFilters())

const expensePage = ref<ExpensePage | null>(null)
const expensePageNum = ref(1)
const expensesLoading = ref(false)
const expensesError = ref<string | null>(null)

async function fetchExpenses() {
  expensesLoading.value = true
  expensesError.value = null
  try {
    expensePage.value = await listExpenses({
      ...expenseFilterQuery(expenseFilters.value),
      page: expensePageNum.value,
      pageSize: PAGE_SIZE,
    })
  } catch (err) {
    expensesError.value = err instanceof ApiError ? err.message : 'Could not load expenses.'
  } finally {
    expensesLoading.value = false
  }
}

watch(expenseFilters, () => {
  expensePageNum.value = 1
  fetchExpenses()
})

function goToExpensePage(newPage: number) {
  expensePageNum.value = newPage
  fetchExpenses()
}

// --- Edicion y borrado de gastos ---

const editingExpense = ref<Expense | null>(null)
const deletingExpense = ref<Expense | null>(null)
const expenseDeleteSaving = ref(false)
const expenseDeleteError = ref<string | null>(null)

async function onExpenseSaved() {
  editingExpense.value = null
  await fetchExpenses()
}

function askDeleteExpense(expense: Expense) {
  deletingExpense.value = expense
  expenseDeleteError.value = null
}

async function confirmDeleteExpense() {
  if (!deletingExpense.value) return
  expenseDeleteSaving.value = true
  expenseDeleteError.value = null
  try {
    await deleteExpense(deletingExpense.value.id)
    deletingExpense.value = null
    if (expensePage.value?.items.length === 1 && expensePageNum.value > 1) {
      expensePageNum.value -= 1
    }
    await fetchExpenses()
  } catch (err) {
    expenseDeleteError.value =
      err instanceof ApiError ? err.message : 'Could not delete this record.'
  } finally {
    expenseDeleteSaving.value = false
  }
}

function selectType(type: RecordType) {
  router.push({ name: 'admin-records', params: { type: type.id } })
}

// Cada tipo se carga la primera vez que se abre (por click o entrando directo por URL).
function loadIfNeeded(type: RecordType) {
  if (type.id === 'weight' && weightPage.value === null) {
    fetchWeights()
  }
  if (type.id === 'meal' && !mealsFetched.value) {
    fetchMeals()
  }
  if (type.id === 'expense' && expensePage.value === null) {
    fetchExpenses()
  }
}

function applyDateFilter() {
  if (activeType.value.id === 'meal') {
    fetchMeals()
    return
  }
  page.value = 1
  fetchWeights()
}

function goToPage(newPage: number) {
  page.value = newPage
  fetchWeights()
}

// --- Edicion y borrado ---

const editing = ref<Weight | null>(null)
const deleting = ref<Weight | null>(null)
const deleteSaving = ref(false)
const deleteError = ref<string | null>(null)

async function onSaved() {
  editing.value = null
  await fetchWeights()
}

function askDelete(record: Weight) {
  deleting.value = record
  deleteError.value = null
}

async function confirmDelete() {
  if (!deleting.value) return
  deleteSaving.value = true
  deleteError.value = null
  try {
    await deleteWeight(deleting.value.id)
    deleting.value = null
    // Si se borro el unico registro de la ultima pagina, esa pagina deja de
    // existir: hay que retroceder para no quedar en una vista vacia.
    if (weightPage.value?.items.length === 1 && page.value > 1) page.value -= 1
    await fetchWeights()
  } catch (err) {
    deleteError.value = err instanceof ApiError ? err.message : 'Could not delete this record.'
  } finally {
    deleteSaving.value = false
  }
}

// --- Edicion y borrado de comidas ---

const editingMeal = ref<Meal | null>(null)
const deletingMeal = ref<Meal | null>(null)
const mealDeleteSaving = ref(false)
const mealDeleteError = ref<string | null>(null)

async function onMealSaved() {
  editingMeal.value = null
  await fetchMeals()
}

function askDeleteMeal(meal: Meal) {
  deletingMeal.value = meal
  mealDeleteError.value = null
}

async function confirmDeleteMeal() {
  if (!deletingMeal.value) return
  mealDeleteSaving.value = true
  mealDeleteError.value = null
  try {
    await deleteMeal(deletingMeal.value.id)
    deletingMeal.value = null
    await fetchMeals()
  } catch (err) {
    mealDeleteError.value = err instanceof ApiError ? err.message : 'Could not delete this record.'
  } finally {
    mealDeleteSaving.value = false
  }
}

watch(activeType, loadIfNeeded, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-foreground">View records</h1>
        <p class="text-sm text-muted">Browse everything you've logged, filtered by date.</p>
      </div>
      <div class="flex shrink-0 gap-2">
        <RouterLink
          v-if="activeType.implemented"
          :to="{ name: 'admin-quick-add', params: { type: activeType.id } }"
          class="flex items-center gap-1.5 rounded-lg border border-subtle px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-accent-text/50 hover:text-foreground"
        >
          <Plus class="h-4 w-4" />
          Add {{ activeType.label.toLowerCase() }}
        </RouterLink>
        <RouterLink
          :to="{
            name: 'admin-analytics-finance',
            params: activeType.id === 'expense' ? { type: 'expenses' } : {},
          }"
          class="rounded-lg border border-subtle px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-accent-text/50 hover:text-foreground"
        >
          View trends
        </RouterLink>
      </div>
    </div>

    <div class="flex flex-wrap gap-2 border-b border-subtle pb-4">
      <button
        v-for="type in recordTypes"
        :key="type.id"
        type="button"
        class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        :class="
          activeType.id === type.id
            ? 'bg-accent/10 text-accent-text'
            : 'text-muted hover:bg-surface hover:text-foreground'
        "
        @click="selectType(type)"
      >
        <component :is="type.icon" class="h-4 w-4" />
        {{ type.label }}
      </button>
    </div>

    <ExpenseFilterBar v-if="activeType.id === 'expense'" v-model="expenseFilters" />

    <div v-else class="flex flex-wrap items-end gap-4">
      <label class="text-sm">
        <span class="mb-1 block text-muted">From</span>
        <input
          v-model="startDate"
          type="date"
          class="rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
          @change="applyDateFilter"
        />
      </label>
      <label class="text-sm">
        <span class="mb-1 block text-muted">To</span>
        <input
          v-model="endDate"
          type="date"
          class="rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
          @change="applyDateFilter"
        />
      </label>
      <p v-if="!['weight', 'meal'].includes(activeType.id)" class="text-xs text-muted">
        No additional filters for this category yet.
      </p>
    </div>

    <BaseCard v-if="activeType.id === 'weight'">
      <p v-if="loading" class="py-6 text-center text-sm text-muted">Loading...</p>
      <p v-else-if="error" class="py-6 text-center text-sm text-ruby-text">{{ error }}</p>
      <EmptyState
        v-else-if="!weightPage?.items.length"
        :icon="Scale"
        title="No weight records yet"
        description="Log one from Add record and it'll show up here."
      />
      <template v-else>
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="text-muted">
              <th class="pb-2 font-medium">Date</th>
              <th class="pb-2 font-medium">Weight</th>
              <th class="pb-2 font-medium">Note</th>
              <th class="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-subtle">
            <tr v-for="item in weightPage.items" :key="item.id">
              <td class="py-2 text-foreground">{{ item.recorded_on }}</td>
              <td class="py-2 text-foreground">{{ item.weight_kg }} kg</td>
              <td class="py-2 text-muted">{{ item.note ?? '—' }}</td>
              <td class="py-2 text-right">
                <button
                  type="button"
                  title="Edit record"
                  class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
                  @click="editing = item"
                >
                  <Pencil class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Delete record"
                  class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
                  @click="askDelete(item)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="mt-4 flex items-center justify-between text-sm text-muted">
          <span
            >Page {{ weightPage.page }} of {{ weightPage.total_pages || 1 }} ({{
              weightPage.total
            }}
            total)</span
          >
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-md border border-subtle px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="page <= 1"
              @click="goToPage(page - 1)"
            >
              Previous
            </button>
            <button
              type="button"
              class="rounded-md border border-subtle px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="page >= weightPage.total_pages"
              @click="goToPage(page + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </template>
    </BaseCard>

    <div v-else-if="activeType.id === 'meal'">
      <p v-if="mealsLoading" class="py-6 text-center text-sm text-muted">Loading...</p>
      <p v-else-if="mealsError" class="py-6 text-center text-sm text-ruby-text">{{ mealsError }}</p>
      <EmptyState
        v-else-if="!mealDayGroups.length"
        :icon="Salad"
        title="No meal records yet"
        description="Log one from Add record and it'll show up here."
      />
      <div v-else class="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:items-start xl:grid-cols-3">
        <div
          v-for="group in mealDayGroups"
          :key="group.dateKey"
          class="overflow-hidden rounded-lg border border-subtle bg-surface"
        >
          <button
            type="button"
            class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
            @click="toggleMealDay(group.dateKey)"
          >
            <div class="flex min-w-0 items-center gap-1.5">
              <component
                :is="expandedMealDays.has(group.dateKey) ? ChevronDown : ChevronRight"
                class="h-3.5 w-3.5 shrink-0 text-muted"
              />
              <p class="truncate text-sm text-foreground">
                <span class="font-medium">{{ formatShortDate(group.date) }}</span>
                <span class="text-muted">
                  · {{ weekdayLabel(group.date).slice(0, 3) }} · {{ group.meals.length }} meal{{
                    group.meals.length === 1 ? '' : 's'
                  }}
                </span>
              </p>
            </div>
            <div
              class="relative h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-subtle"
              :title="`Total portion: ${group.totalPortion}%`"
            >
              <div
                class="absolute inset-y-0 left-0 overflow-hidden"
                :style="{ width: `${mealScalePositionPercent(group.totalPortion)}%` }"
              >
                <div
                  class="h-full"
                  :style="{
                    width: `${MEAL_BAR_WIDTH_PX}px`,
                    background: `linear-gradient(to right, ${mealScaleGradientCss})`,
                  }"
                />
              </div>
            </div>
          </button>

          <div
            v-if="expandedMealDays.has(group.dateKey)"
            class="space-y-2 border-t border-subtle p-3"
          >
            <div
              v-for="meal in group.meals"
              :key="meal.id"
              class="rounded-lg border border-subtle bg-background p-3 text-sm"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="font-medium text-foreground">
                    {{ formatMealTime(meal) }} · {{ mealTypeLabel(meal.meal_type) }}
                  </p>
                  <p class="text-xs text-muted">Portion: {{ meal.meal_size }}%</p>
                </div>
                <div class="flex shrink-0 gap-1">
                  <button
                    type="button"
                    title="Edit record"
                    class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
                    @click="editingMeal = meal"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Delete record"
                    class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
                    @click="askDeleteMeal(meal)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div
                v-if="parseMealContent(meal.meal_content).length"
                class="mt-2 flex flex-wrap gap-1"
              >
                <span
                  v-for="component in parseMealContent(meal.meal_content)"
                  :key="component.name"
                  class="rounded-full bg-surface px-2 py-0.5 text-xs text-muted"
                >
                  {{ component.name }} {{ component.percent }}%
                </span>
              </div>
              <p v-if="meal.drink" class="mt-1 text-xs text-muted">Drink: {{ meal.drink }}</p>
              <p v-if="meal.note" class="mt-1 text-xs text-muted">{{ meal.note }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <BaseCard v-else-if="activeType.id === 'expense'">
      <p v-if="expensesLoading" class="py-6 text-center text-sm text-muted">Loading...</p>
      <p v-else-if="expensesError" class="py-6 text-center text-sm text-ruby-text">
        {{ expensesError }}
      </p>
      <EmptyState
        v-else-if="!expensePage?.items.length"
        :icon="ReceiptText"
        title="No expenses yet"
        description="Log one from Add record and it'll show up here."
      />
      <template v-else>
        <table class="w-full table-fixed text-left text-sm">
          <colgroup>
            <col class="w-24" />
            <col class="w-40" />
            <col class="w-32" />
            <col class="w-32" />
            <col class="w-24" />
            <col class="w-16" />
            <col />
            <col class="w-16" />
          </colgroup>
          <thead>
            <tr class="text-muted">
              <th class="pb-2 font-medium">Date</th>
              <th class="pb-2 font-medium">Name</th>
              <th class="pb-2 font-medium">Category</th>
              <th class="pb-2 font-medium">Payment method</th>
              <th class="pb-2 font-medium">Amount</th>
              <th class="pb-2 font-medium">Tags</th>
              <th class="pb-2 font-medium">Note</th>
              <th class="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-subtle">
            <tr v-for="item in expensePage.items" :key="item.id">
              <td class="py-2 whitespace-nowrap text-foreground">{{ item.recorded_on }}</td>
              <td class="py-2 text-foreground">
                <span class="block truncate" :title="item.name">{{ item.name }}</span>
              </td>
              <td class="py-2">
                <span class="flex min-w-0 items-center gap-1.5 text-foreground">
                  <span
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                    :class="financeColorClasses(item.category.color_key).bg"
                  >
                    <component
                      :is="financeIcon(item.category.icon_key)"
                      class="h-3 w-3"
                      :class="financeColorClasses(item.category.color_key).text"
                    />
                  </span>
                  <span class="truncate" :title="item.category.name">{{ item.category.name }}</span>
                </span>
              </td>
              <td class="py-2">
                <span class="flex min-w-0 items-center gap-1.5 text-foreground">
                  <span
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                    :class="financeColorClasses(item.payment_method.color_key).bg"
                  >
                    <component
                      :is="financeIcon(item.payment_method.icon_key)"
                      class="h-3 w-3"
                      :class="financeColorClasses(item.payment_method.color_key).text"
                    />
                  </span>
                  <span class="truncate" :title="item.payment_method.name">{{
                    item.payment_method.name
                  }}</span>
                </span>
              </td>
              <td class="py-2 whitespace-nowrap text-foreground">{{ formatCOP(item.amount) }}</td>
              <td class="py-2">
                <span v-if="!item.tags.length" class="text-muted">—</span>
                <!-- Lista desplegable en vez de badges inline: con varios tags
                     rompia el ancho de la columna. -->
                <details v-else class="relative">
                  <summary
                    class="flex w-fit cursor-pointer list-none items-center gap-1 rounded-md border border-subtle px-1.5 py-0.5 text-xs text-muted hover:text-foreground [&::-webkit-details-marker]:hidden"
                  >
                    <Tag class="h-3 w-3" />
                    {{ item.tags.length }}
                  </summary>
                  <div
                    class="absolute z-10 mt-1 flex w-max max-w-48 flex-col gap-1 rounded-lg border border-subtle bg-surface p-2 shadow-lg"
                  >
                    <span
                      v-for="tag in item.tags"
                      :key="tag.id"
                      class="rounded-full border px-2 py-0.5 text-xs font-medium"
                      :class="[
                        financeColorClasses(tag.color_key).bg,
                        financeColorClasses(tag.color_key).text,
                        financeColorClasses(tag.color_key).border,
                      ]"
                    >
                      {{ tag.name }}
                    </span>
                  </div>
                </details>
              </td>
              <td class="py-2 text-muted">
                <span class="block truncate" :title="item.note ?? undefined">{{
                  item.note ?? '—'
                }}</span>
              </td>
              <td class="py-2 text-right whitespace-nowrap">
                <button
                  type="button"
                  title="Edit record"
                  class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
                  @click="editingExpense = item"
                >
                  <Pencil class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Delete record"
                  class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
                  @click="askDeleteExpense(item)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="mt-4 flex items-center justify-between text-sm text-muted">
          <span
            >Page {{ expensePage.page }} of {{ expensePage.total_pages || 1 }} ({{
              expensePage.total
            }}
            total)</span
          >
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-md border border-subtle px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="expensePageNum <= 1"
              @click="goToExpensePage(expensePageNum - 1)"
            >
              Previous
            </button>
            <button
              type="button"
              class="rounded-md border border-subtle px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="expensePageNum >= expensePage.total_pages"
              @click="goToExpensePage(expensePageNum + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </template>
    </BaseCard>

    <EmptyState
      v-else
      :icon="activeType.icon"
      :title="`${activeType.label} — coming soon`"
      description="This category is a navigable prototype for now; it isn't connected to real data yet."
    />

    <WeightFormDialog :record="editing" @close="editing = null" @saved="onSaved" />
    <MealFormDialog :record="editingMeal" @close="editingMeal = null" @saved="onMealSaved" />
    <ExpenseFormDialog
      :record="editingExpense"
      @close="editingExpense = null"
      @saved="onExpenseSaved"
    />

    <div
      v-if="deleting"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      @click.self="deleting = null"
    >
      <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
        <h3 class="mb-2 text-sm font-semibold text-foreground">
          Delete the record of {{ deleting.recorded_on }}?
        </h3>
        <p class="text-sm text-muted">{{ deleting.weight_kg }} kg. This can't be undone.</p>

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
            @click="confirmDelete"
          >
            {{ deleteSaving ? 'Deleting...' : 'Delete' }}
          </BaseButton>
        </div>
      </div>
    </div>

    <div
      v-if="deletingMeal"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      @click.self="deletingMeal = null"
    >
      <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
        <h3 class="mb-2 text-sm font-semibold text-foreground">
          Delete the {{ formatMealTime(deletingMeal) }}
          {{ mealTypeLabel(deletingMeal.meal_type).toLowerCase() }}?
        </h3>
        <p class="text-sm text-muted">This can't be undone.</p>

        <p v-if="mealDeleteError" class="mt-3 text-sm text-ruby-text">{{ mealDeleteError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <BaseButton
            variant="secondary"
            type="button"
            :disabled="mealDeleteSaving"
            @click="deletingMeal = null"
          >
            Cancel
          </BaseButton>
          <BaseButton
            variant="primary"
            type="button"
            :disabled="mealDeleteSaving"
            class="!bg-ruby hover:!bg-ruby/90"
            @click="confirmDeleteMeal"
          >
            {{ mealDeleteSaving ? 'Deleting...' : 'Delete' }}
          </BaseButton>
        </div>
      </div>
    </div>

    <div
      v-if="deletingExpense"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      @click.self="deletingExpense = null"
    >
      <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
        <h3 class="mb-2 text-sm font-semibold text-foreground">
          Delete "{{ deletingExpense.name }}"?
        </h3>
        <p class="text-sm text-muted">
          {{ formatCOP(deletingExpense.amount) }} on {{ deletingExpense.recorded_on }}. This can't
          be undone.
        </p>

        <p v-if="expenseDeleteError" class="mt-3 text-sm text-ruby-text">
          {{ expenseDeleteError }}
        </p>

        <div class="mt-5 flex justify-end gap-2">
          <BaseButton
            variant="secondary"
            type="button"
            :disabled="expenseDeleteSaving"
            @click="deletingExpense = null"
          >
            Cancel
          </BaseButton>
          <BaseButton
            variant="primary"
            type="button"
            :disabled="expenseDeleteSaving"
            class="!bg-ruby hover:!bg-ruby/90"
            @click="confirmDeleteExpense"
          >
            {{ expenseDeleteSaving ? 'Deleting...' : 'Delete' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
