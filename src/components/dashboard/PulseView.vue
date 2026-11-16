<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'

import PulseMetricCard from '@/components/dashboard/PulseMetricCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useAuth } from '@/composables/useAuth'
import { formatCOP } from '@/lib/currency'
import { addDays, formatIsoDate, formatShortDate, parseIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { getDashboardPulse, interpretDashboardPulse } from '@/services/dashboardApi'
import type { DashboardPulse, PulseInterpretation } from '@/types/dashboard'

const { can } = useAuth()
const canInterpret = can('ai')

const pulse = ref<DashboardPulse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const interpretation = ref<PulseInterpretation | null>(null)
const interpreting = ref(false)
const interpretError = ref<string | null>(null)

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}

// Sin argumento: la semana en curso (la decide el backend, en la zona del usuario).
async function load(weekStart?: string) {
  loading.value = true
  error.value = null
  interpretation.value = null
  interpretError.value = null
  try {
    pulse.value = await getDashboardPulse(weekStart)
  } catch (err) {
    error.value = messageOf(err, 'Could not load the weekly pulse.')
  } finally {
    loading.value = false
  }
}

function shiftWeek(weeks: number) {
  if (!pulse.value) return
  load(formatIsoDate(addDays(parseIsoDate(pulse.value.week.first_day), weeks * 7)))
}

async function interpret() {
  if (!pulse.value) return
  interpreting.value = true
  interpretError.value = null
  try {
    interpretation.value = await interpretDashboardPulse(pulse.value.week.first_day)
  } catch (err) {
    interpretError.value = messageOf(err, 'Could not get the interpretation.')
  } finally {
    interpreting.value = false
  }
}

const weekLabel = computed(() => {
  if (!pulse.value) return ''
  const { first_day, last_day } = pulse.value.week
  const last = parseIsoDate(last_day)
  return `${formatShortDate(parseIsoDate(first_day))} – ${formatShortDate(last)}, ${last.getFullYear()}`
})

// D3: la semana en curso se compara contra semanas completas; la barra deja
// ver cuanto de ella ya paso.
const progressPct = computed(() => {
  if (!pulse.value) return 0
  const { elapsed_days, total_days } = pulse.value.week
  return Math.round((100 * elapsed_days) / total_days)
})

const hasAnySection = computed(
  () =>
    !!pulse.value &&
    !!(pulse.value.planning || pulse.value.finances || pulse.value.weight || pulse.value.english),
)

function trimNumber(value: number, decimals = 1): string {
  return String(Number(value.toFixed(decimals)))
}

const formatPct = (value: number) => `${trimNumber(value)}%`
const formatMoney = (value: number) => formatCOP(Math.round(value))
const formatKg = (value: number) => `${trimNumber(value)} kg`
const formatCount = (value: number) => trimNumber(value)

onMounted(() => load())
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-1">
        <button
          type="button"
          title="Previous week"
          class="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
          :disabled="loading || !pulse"
          @click="shiftWeek(-1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <p class="min-w-[11rem] text-center text-sm font-medium text-foreground">
          {{ weekLabel || '...' }}
        </p>
        <button
          type="button"
          title="Next week"
          class="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="loading || !pulse || pulse.week.in_progress"
          @click="shiftWeek(1)"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>

      <div v-if="pulse?.week.in_progress" class="flex items-center gap-2" data-test="week-progress">
        <span class="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent-text">
          In progress
        </span>
        <div
          class="h-1.5 w-24 rounded-full bg-surface-hover"
          role="progressbar"
          :aria-valuenow="progressPct"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Week elapsed"
        >
          <div class="h-1.5 rounded-full bg-accent-text" :style="{ width: `${progressPct}%` }" />
        </div>
        <span class="text-xs text-muted">
          Day {{ pulse.week.elapsed_days }} of {{ pulse.week.total_days }}
        </span>
      </div>
    </div>

    <p v-if="error" class="text-sm text-ruby-text">{{ error }}</p>
    <p v-else-if="loading && !pulse" class="text-sm text-muted">Loading...</p>

    <template v-else-if="pulse">
      <p v-if="!hasAnySection" class="text-sm text-muted">
        No modules to compare: ask the administrator for access to one.
      </p>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" :class="{ 'opacity-60': loading }">
        <PulseMetricCard
          v-if="pulse.planning"
          title="Checklist score"
          :comparison="pulse.planning.score_pct"
          :format="formatPct"
          good-when="up"
        />

        <PulseMetricCard
          v-if="pulse.finances"
          title="Spending"
          :comparison="pulse.finances.spent"
          :format="formatMoney"
          good-when="down"
        >
          <p
            v-if="pulse.finances.top_deviation"
            class="mt-3 border-t border-subtle pt-2 text-xs text-muted"
          >
            Biggest rise:
            <span class="font-medium text-foreground">{{
              pulse.finances.top_deviation.label
            }}</span>
            {{ formatMoney(pulse.finances.top_deviation.current) }} (avg
            {{ formatMoney(pulse.finances.top_deviation.average) }})
          </p>
        </PulseMetricCard>

        <BaseCard v-if="pulse.finances" title="Savings rate (month to date)">
          <p class="text-2xl font-semibold text-foreground">
            {{
              pulse.finances.savings_rate_pct === null
                ? '—'
                : formatPct(pulse.finances.savings_rate_pct)
            }}
          </p>
          <p class="mt-1 text-sm text-muted">
            Income {{ formatMoney(pulse.finances.month_income) }} · Expenses
            {{ formatMoney(pulse.finances.month_expenses) }}
          </p>
          <p class="mt-1 text-xs text-muted">
            {{ formatShortDate(parseIsoDate(pulse.finances.month_first_day)) }} –
            {{ formatShortDate(parseIsoDate(pulse.finances.month_last_day)) }}
          </p>
        </BaseCard>

        <PulseMetricCard
          v-if="pulse.weight"
          title="Weight (weekly average)"
          :comparison="pulse.weight.average_kg"
          :format="formatKg"
          good-when="neutral"
        />

        <PulseMetricCard
          v-if="pulse.english"
          title="English sessions"
          :comparison="pulse.english.sessions"
          :format="formatCount"
          good-when="up"
        />
      </div>

      <BaseCard v-if="canInterpret && hasAnySection" title="Interpretation">
        <template #actions>
          <BaseButton
            ai-cost
            variant="secondary"
            :disabled="interpreting || loading"
            data-test="interpret"
            @click="interpret"
          >
            {{
              interpreting ? 'Interpreting...' : interpretation ? 'Interpret again' : 'Interpret'
            }}
          </BaseButton>
        </template>
        <p v-if="interpretError" class="text-sm text-ruby-text">{{ interpretError }}</p>
        <p
          v-else-if="interpretation"
          class="whitespace-pre-line text-sm text-foreground"
          data-test="interpretation"
        >
          {{ interpretation.text }}
        </p>
        <p v-else class="text-sm text-muted">
          An AI reading of this week's numbers: what went well, what to watch and one suggestion.
        </p>
      </BaseCard>
    </template>
  </div>
</template>
