<script setup lang="ts">
import { ChevronLeft, ChevronRight, Pencil, Plus, Sparkles, Trash2 } from '@lucide/vue'
import { computed, ref, shallowRef, watch } from 'vue'

import ParamDialog from '@/components/params/ParamDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { calendarRows, groupByMonth, missingCount } from '@/lib/calendarEventsAdmin'
import { parseIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import {
  createCldEvent,
  deleteCldEvent,
  getCalendarYear,
  importMissingHolidays,
  updateCldEvent,
} from '@/services/paramsApi'
import type { CalendarYear, CldEvent, CldEventCode, OfficialHoliday } from '@/types/params'

/**
 * Festivos y fechas especiales (cld_events, globales: solo admin). La
 * libreria del backend propone los festivos oficiales del año; aca se
 * agregan los que falten, se quitan los que no apliquen y se suman propios.
 */
const year = defineModel<number>('year', { required: true })

const data = shallowRef<CalendarYear | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const busy = ref(false)

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await getCalendarYear(year.value)
  } catch (err) {
    error.value = messageOf(err, 'Could not load the calendar events.')
  } finally {
    loading.value = false
  }
}

watch(year, load, { immediate: true })

const groups = computed(() => (data.value ? groupByMonth(calendarRows(data.value)) : []))
const missing = computed(() => (data.value ? missingCount(data.value) : 0))

const CODE_LABELS: Record<string, string> = { HOLIDAY: 'Holiday', SPECIAL_DATE: 'Special date' }

function monthLabel(month: string): string {
  return parseIsoDate(`${month}-01`).toLocaleDateString('en-US', { month: 'long' })
}

function dayParts(isoDay: string) {
  const date = parseIsoDate(isoDay)
  return {
    day: date.getDate(),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
  }
}

function rangeText(event: CldEvent): string | null {
  if (event.first_day === event.last_day) return null
  const fmt = (iso: string) =>
    parseIsoDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(event.first_day)} – ${fmt(event.last_day)}`
}

async function run(action: () => Promise<unknown>, fallback: string) {
  busy.value = true
  error.value = null
  try {
    await action()
    await load()
  } catch (err) {
    error.value = messageOf(err, fallback)
  } finally {
    busy.value = false
  }
}

function addMissing() {
  run(() => importMissingHolidays(year.value), 'Could not add the holidays.')
}

function addOfficial(holiday: OfficialHoliday) {
  run(
    () =>
      createCldEvent({
        code: 'HOLIDAY',
        first_day: holiday.day,
        last_day: holiday.day,
        name: holiday.name,
      }),
    'Could not add the holiday.',
  )
}

// --- Quitar (con confirmacion: un evento propio no se recupera) ---

const removing = shallowRef<CldEvent | null>(null)

function confirmRemove() {
  const event = removing.value
  if (!event) return
  removing.value = null
  run(() => deleteCldEvent(event.id), 'Could not remove the event.')
}

// --- Alta / edicion ---

const dialogOpen = ref(false)
const editing = shallowRef<CldEvent | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const form = ref({
  code: 'HOLIDAY' as CldEventCode,
  name: '',
  firstDay: '',
  lastDay: '',
  detail: '',
})

function openCreate() {
  editing.value = null
  formError.value = null
  const firstDay = `${year.value}-01-01`
  form.value = { code: 'HOLIDAY', name: '', firstDay, lastDay: firstDay, detail: '' }
  dialogOpen.value = true
}

function openEdit(event: CldEvent) {
  editing.value = event
  formError.value = null
  form.value = {
    code: event.code === 'SPECIAL_DATE' ? 'SPECIAL_DATE' : 'HOLIDAY',
    name: event.name,
    firstDay: event.first_day,
    lastDay: event.last_day,
    detail: event.detail ?? '',
  }
  dialogOpen.value = true
}

// Mover el inicio despues del fin arrastra el fin (lo comun es un solo dia).
watch(
  () => form.value.firstDay,
  (firstDay) => {
    if (firstDay && form.value.lastDay < firstDay) form.value.lastDay = firstDay
  },
)

async function submit() {
  saving.value = true
  formError.value = null
  const payload = {
    code: form.value.code,
    name: form.value.name,
    first_day: form.value.firstDay,
    last_day: form.value.lastDay,
    detail: form.value.detail.trim() || null,
  }
  try {
    if (editing.value) await updateCldEvent(editing.value.id, payload)
    else await createCldEvent(payload)
    dialogOpen.value = false
    // Si se cargo en otro año, se salta a ese año para verlo.
    const savedYear = Number(payload.first_day.slice(0, 4))
    if (savedYear !== year.value) year.value = savedYear
    else await load()
  } catch (err) {
    formError.value = messageOf(err, 'Could not save the event.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseCard>
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-1">
        <button
          type="button"
          title="Previous year"
          class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
          @click="year -= 1"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <h2 class="w-14 text-center text-base font-semibold tabular-nums text-foreground">
          {{ year }}
        </h2>
        <button
          type="button"
          title="Next year"
          class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
          @click="year += 1"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
      <BaseButton variant="secondary" class="!px-3 !py-1.5" @click="openCreate">
        <Plus class="h-4 w-4" />
        Add date
      </BaseButton>
    </header>

    <div
      v-if="data"
      class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-subtle bg-background px-3 py-2.5 text-sm"
    >
      <p class="flex items-center gap-2 text-muted">
        <Sparkles class="h-4 w-4 text-accent-text" />
        <span>
          {{ data.official_holidays.length }} official holidays in {{ data.country }} for
          {{ year }} ·
          <template v-if="missing">
            <strong class="text-foreground">{{ missing }} not in the calendar</strong>
          </template>
          <template v-else>all in the calendar</template>
        </span>
      </p>
      <BaseButton v-if="missing" class="!px-3 !py-1.5" :disabled="busy" @click="addMissing">
        Add {{ missing }} missing
      </BaseButton>
    </div>

    <p v-if="error" class="mb-3 text-sm text-ruby-text">{{ error }}</p>
    <p v-if="loading && !data" class="py-6 text-center text-sm text-muted">Loading...</p>
    <p v-else-if="data && !groups.length" class="py-6 text-center text-sm text-muted">
      Nothing for {{ year }} yet.
    </p>

    <div v-else class="space-y-5" :class="busy || loading ? 'opacity-60' : ''">
      <section v-for="group in groups" :key="group.month">
        <h3 class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          {{ monthLabel(group.month) }}
        </h3>
        <ul class="space-y-1">
          <li
            v-for="row in group.rows"
            :key="row.key"
            class="flex items-center gap-3 rounded-lg px-2 py-1.5"
            :class="
              row.kind === 'missing'
                ? 'border border-dashed border-subtle'
                : 'hover:bg-surface-hover'
            "
          >
            <span
              class="flex w-10 shrink-0 flex-col items-center leading-none"
              :class="row.kind === 'missing' ? 'text-muted' : 'text-foreground'"
            >
              <span class="text-base font-semibold tabular-nums">{{ dayParts(row.day).day }}</span>
              <span class="text-[10px] uppercase text-muted">{{ dayParts(row.day).weekday }}</span>
            </span>

            <template v-if="row.kind === 'event'">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm text-foreground">{{ row.event.name }}</p>
                <p class="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span
                    class="font-medium"
                    :class="row.event.code === 'HOLIDAY' ? 'text-ruby-text' : 'text-accent-text'"
                  >
                    {{ CODE_LABELS[row.event.code] ?? row.event.code }}
                  </span>
                  <span v-if="row.official">· Official</span>
                  <span v-else-if="row.event.code === 'HOLIDAY'">· Custom</span>
                  <span v-if="rangeText(row.event)">· {{ rangeText(row.event) }}</span>
                  <span v-if="row.event.detail" class="truncate">· {{ row.event.detail }}</span>
                </p>
              </div>
              <div class="flex shrink-0 gap-1">
                <button
                  type="button"
                  :title="`Edit ${row.event.name}`"
                  class="rounded-md p-1.5 text-muted hover:bg-surface hover:text-foreground"
                  @click="openEdit(row.event)"
                >
                  <Pencil class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  :title="`Remove ${row.event.name}`"
                  class="rounded-md p-1.5 text-muted hover:bg-surface hover:text-ruby-text"
                  @click="removing = row.event"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </template>

            <template v-else>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm text-muted">{{ row.holiday.name }}</p>
                <p class="text-xs text-muted">Official holiday · not in the calendar</p>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-md border border-subtle px-2.5 py-1 text-xs font-medium text-muted hover:border-accent-text/50 hover:text-foreground disabled:opacity-50"
                :disabled="busy"
                @click="addOfficial(row.holiday)"
              >
                Add
              </button>
            </template>
          </li>
        </ul>
      </section>
    </div>
  </BaseCard>

  <ParamDialog
    :open="dialogOpen"
    :title="editing ? 'Edit date' : 'New date'"
    :saving="saving"
    :error="formError"
    @close="dialogOpen = false"
    @submit="submit"
  >
    <div class="grid grid-cols-2 gap-1 rounded-lg border border-subtle bg-background p-1 text-sm">
      <button
        v-for="code in ['HOLIDAY', 'SPECIAL_DATE'] as const"
        :key="code"
        type="button"
        class="rounded-md px-3 py-1.5 font-medium transition-colors"
        :class="form.code === code ? 'bg-accent text-white' : 'text-muted hover:text-foreground'"
        @click="form.code = code"
      >
        {{ CODE_LABELS[code] }}
      </button>
    </div>
    <p class="text-xs text-muted">
      {{
        form.code === 'HOLIDAY'
          ? 'A day off for everyone (shown as a holiday in the calendar).'
          : "A date worth remembering that isn't a day off (Mother's Day, Halloween)."
      }}
    </p>
    <label class="block text-sm">
      <span class="mb-1 block text-muted">Name *</span>
      <input
        v-model="form.name"
        type="text"
        maxlength="200"
        required
        class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
      />
    </label>
    <div class="grid grid-cols-2 gap-3">
      <label class="block text-sm">
        <span class="mb-1 block text-muted">From *</span>
        <input
          v-model="form.firstDay"
          type="date"
          required
          class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
        />
      </label>
      <label class="block text-sm">
        <span class="mb-1 block text-muted">To *</span>
        <input
          v-model="form.lastDay"
          type="date"
          required
          :min="form.firstDay"
          class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
        />
      </label>
    </div>
    <label class="block text-sm">
      <span class="mb-1 block text-muted">Detail</span>
      <textarea
        v-model="form.detail"
        rows="2"
        maxlength="2000"
        class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
      />
    </label>
  </ParamDialog>

  <div
    v-if="removing"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
    @click.self="removing = null"
  >
    <div
      role="alertdialog"
      :aria-label="`Remove ${removing.name}`"
      class="w-full max-w-sm space-y-4 rounded-xl border border-subtle bg-surface p-5"
    >
      <h3 class="text-sm font-semibold text-foreground">Remove "{{ removing.name }}"?</h3>
      <p class="text-sm text-muted">
        It disappears from everyone's calendar. An official holiday can be added back from the
        suggestions; a custom date can't.
      </p>
      <div class="flex justify-end gap-2">
        <BaseButton variant="ghost" @click="removing = null">Cancel</BaseButton>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-ruby px-4 py-2 text-sm font-medium text-white hover:bg-ruby/90"
          @click="confirmRemove"
        >
          Remove
        </button>
      </div>
    </div>
  </div>
</template>
