<script setup lang="ts">
import { onMounted, ref } from 'vue'

import DirectIncomeForm from '@/components/quick-add/income/DirectIncomeForm.vue'
import InterestIncomeForm from '@/components/quick-add/income/InterestIncomeForm.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { useIncomeOptions } from '@/composables/useIncomeOptions'
import type { IncomeKind } from '@/types/income'

// Dos tipos de ingreso con granularidad distinta (directo: por dia;
// intereses: por mes), por eso cada uno tiene su propio form. Ambos leen los
// catalogos del mismo cache (useIncomeOptions): un solo request al entrar,
// y alternar entre tipos no vuelve a llamar a la API.
const kind = ref<IncomeKind>('direct')
const { loadError, ensureLoaded } = useIncomeOptions()

onMounted(ensureLoaded)

const kinds: { id: IncomeKind; label: string }[] = [
  { id: 'direct', label: 'Direct' },
  { id: 'interest', label: 'Interest' },
]
</script>

<template>
  <BaseCard :title="kind === 'direct' ? 'New income' : 'New interest income'">
    <template #actions>
      <div class="flex rounded-lg border border-subtle p-0.5">
        <button
          v-for="option in kinds"
          :key="option.id"
          type="button"
          :data-test="`income-kind-${option.id}`"
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
    </template>

    <p v-if="loadError" class="mb-4 text-sm text-ruby-text">
      Could not load sources and subcategories.
      <button type="button" class="underline" @click="ensureLoaded">Retry</button>
    </p>

    <!-- v-show: alternar entre tipos no borra lo que ya se habia escrito en el otro. -->
    <DirectIncomeForm v-show="kind === 'direct'" />
    <InterestIncomeForm v-show="kind === 'interest'" />
  </BaseCard>
</template>
