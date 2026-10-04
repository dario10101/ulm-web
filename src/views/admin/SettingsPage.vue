<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AccessPanel from '@/components/params/AccessPanel.vue'
import AppearancePanel from '@/components/params/AppearancePanel.vue'
import CalendarEventsPanel from '@/components/params/CalendarEventsPanel.vue'
import IconCatalogPanel from '@/components/params/IconCatalogPanel.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useAuth } from '@/composables/useAuth'
import {
  DEFAULT_SETTINGS_SECTION,
  settingsSections,
  type SettingsSection,
} from '@/config/paramPanels'
import { expenseCategoriesApi, paymentMethodsApi } from '@/services/paramsApi'

// /admin solo se ve con sesion (router/authGuard.ts), asi que user ya esta cargado.
const { user, isAdmin } = useAuth()
const route = useRoute()
const router = useRouter()

const visibleSections = computed(() =>
  settingsSections.filter((s) => !s.adminOnly || isAdmin.value),
)

const groups = computed(() =>
  (['Account', 'System'] as const)
    .map((group) => ({ group, sections: visibleSections.value.filter((s) => s.group === group) }))
    .filter((g) => g.sections.length),
)

// La seccion vive en la URL (/admin/settings/appearance). Sin param, con uno
// invalido o con una de admin sin serlo, se corrige a "general".
const active = computed<SettingsSection>(
  () =>
    visibleSections.value.find((s) => s.id === route.params.section) ??
    visibleSections.value.find((s) => s.id === DEFAULT_SETTINGS_SECTION)!,
)

watch(
  () => route.params.section,
  (section) => {
    if (section !== active.value.id) {
      router.replace({ name: 'admin-settings', params: { section: active.value.id } })
    }
  },
  { immediate: true },
)

// El año de "Holidays & dates" tambien va en la URL (?year=2027): enlazable y
// el boton atras vuelve al año anterior.
const calendarYear = computed<number>({
  get: () => {
    const year = Number(route.query.year)
    return Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : new Date().getFullYear()
  },
  set: (year) => router.push({ query: { ...route.query, year: String(year) } }),
})

const toggles = [
  { label: 'Daily checklist reminder', enabled: true },
  { label: 'Weekly analytics summary email', enabled: false },
  { label: 'Habit streak alerts', enabled: true },
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-foreground">Settings</h1>
      <p class="text-sm text-muted">
        Your account and preferences<template v-if="isAdmin">
          , plus the system parameters shared by every user</template
        >.
      </p>
    </div>

    <div class="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
      <!-- Mobile: pestañas con scroll horizontal. md+: menu lateral por grupos. -->
      <nav aria-label="Settings sections" class="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div class="flex gap-1 md:flex-col md:gap-4">
          <div v-for="g in groups" :key="g.group" class="flex gap-1 md:flex-col">
            <p
              class="hidden px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted md:block"
            >
              {{ g.group }}
            </p>
            <RouterLink
              v-for="section in g.sections"
              :key="section.id"
              :to="{ name: 'admin-settings', params: { section: section.id } }"
              class="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                active.id === section.id
                  ? 'bg-accent/10 text-accent-text'
                  : 'text-muted hover:bg-surface hover:text-foreground'
              "
            >
              <component :is="section.icon" class="h-4 w-4" />
              {{ section.label }}
            </RouterLink>
          </div>
        </div>
      </nav>

      <div class="min-w-0 max-w-3xl space-y-6">
        <template v-if="active.id === 'general'">
          <BaseCard title="Profile">
            <p class="mb-3 text-sm text-muted">Name and email come from your Google account.</p>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="text-sm">
                <span class="mb-1 block text-muted">Display name</span>
                <input
                  type="text"
                  :value="user?.name ?? ''"
                  readonly
                  class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
                />
              </label>
              <label class="text-sm">
                <span class="mb-1 block text-muted">Email</span>
                <input
                  type="email"
                  :value="user?.email ?? ''"
                  readonly
                  class="w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
                />
              </label>
            </div>
          </BaseCard>

          <BaseCard title="Notifications">
            <p class="mb-2 text-xs text-muted">Visual only for now — nothing is saved.</p>
            <ul class="divide-y divide-subtle">
              <li
                v-for="toggle in toggles"
                :key="toggle.label"
                class="flex items-center justify-between py-2"
              >
                <span class="text-sm text-foreground">{{ toggle.label }}</span>
                <input
                  type="checkbox"
                  :checked="toggle.enabled"
                  class="h-4 w-4 rounded border-subtle accent-cta"
                />
              </li>
            </ul>
          </BaseCard>
        </template>

        <AppearancePanel v-else-if="active.id === 'appearance'" />

        <IconCatalogPanel
          v-else-if="active.id === 'expense-categories'"
          key="expense-categories"
          :api="expenseCategoriesApi"
          title="Expense categories"
          noun="category"
          empty-text="No categories yet."
        />

        <IconCatalogPanel
          v-else-if="active.id === 'payment-methods'"
          key="payment-methods"
          :api="paymentMethodsApi"
          title="Payment methods"
          noun="payment method"
          empty-text="No payment methods yet."
        />

        <CalendarEventsPanel
          v-else-if="active.id === 'calendar-events'"
          v-model:year="calendarYear"
        />

        <AccessPanel v-else-if="active.id === 'access'" />
      </div>
    </div>
  </div>
</template>
