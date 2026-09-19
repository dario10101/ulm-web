<script setup lang="ts">
import { Pencil, Scale, Trash2 } from '@lucide/vue'
import { onMounted, ref } from 'vue'

import BaseCard from '@/components/ui/BaseCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { recordTypes, type RecordType } from '@/config/recordTypes'
import { ApiError } from '@/lib/http'
import { listWeights } from '@/services/weightsApi'
import type { WeightPage } from '@/types/weight'

const PAGE_SIZE = 10

const activeType = ref<RecordType>(recordTypes.find((type) => type.id === 'weight')!)

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

function selectType(type: RecordType) {
  activeType.value = type
  if (type.id === 'weight' && weightPage.value === null) {
    fetchWeights()
  }
}

function applyDateFilter() {
  page.value = 1
  fetchWeights()
}

function goToPage(newPage: number) {
  page.value = newPage
  fetchWeights()
}

onMounted(() => {
  if (activeType.value.id === 'weight') fetchWeights()
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-foreground">View records</h1>
      <p class="text-sm text-muted">Browse everything you've logged, filtered by date.</p>
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

    <div class="flex flex-wrap items-end gap-4">
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
      <p v-if="activeType.id !== 'weight'" class="text-xs text-muted">
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
                  title="Not implemented yet"
                  class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
                >
                  <Pencil class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Not implemented yet"
                  class="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="mt-4 flex items-center justify-between text-sm text-muted">
          <span>Page {{ weightPage.page }} of {{ weightPage.total_pages || 1 }} ({{ weightPage.total }} total)</span>
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

    <EmptyState
      v-else
      :icon="activeType.icon"
      :title="`${activeType.label} — coming soon`"
      description="This category is a navigable prototype for now; it isn't connected to real data yet."
    />
  </div>
</template>
