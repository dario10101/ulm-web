<script setup lang="ts">
import { ImageOff, RefreshCw } from '@lucide/vue'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'

import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { ApiError } from '@/lib/http'
import {
  importBankWords,
  listBankLevels,
  listBankWords,
  nextBankImage,
  processBankBatch,
  setBankWordStatus,
} from '@/services/englishBankApi'
import {
  ENGLISH_LEVELS,
  type EnglishLevel,
  type EnglishLevelBank,
  type EnglishWordAdmin,
  type EnglishWordStatus,
} from '@/types/english'

/**
 * Banco compartido de ingles (ENGLISH-TEACHER-PLAN.md, 5.1).
 *
 * "Fill bank" lo encadena el front: importar hasta 100 palabras nuevas y
 * procesar lotes (~10 palabras: imagen + contenido del LLM) hasta que no
 * quede nada. Cada lote es un request corto; si uno falla, el llenado se
 * corta y se retoma con el mismo boton (el backend solo completa lo que falta).
 *
 * Debajo, la curacion posterior (D24): las imagenes se aprueban solas y aca se
 * cambian por la siguiente candidata o se deshabilita la palabra.
 */
const PAGE_SIZE = 48

const levels = shallowRef<EnglishLevelBank[]>([])
const error = ref<string | null>(null)

// Llenado en curso (uno a la vez).
const filling = ref<EnglishLevel | null>(null)
const fillDone = ref(0)
const fillTotal = ref(0)
const fillSummary = ref<string | null>(null)
const confirmLevel = ref<EnglishLevel | null>(null)

function message(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}

async function loadLevels() {
  try {
    levels.value = await listBankLevels()
  } catch (err) {
    error.value = message(err, 'Could not load the English bank.')
  }
}

function requestFill(row: EnglishLevelBank) {
  if (row.full) {
    confirmLevel.value = row.level
    return
  }
  void fill(row.level)
}

async function confirmFill() {
  const level = confirmLevel.value
  confirmLevel.value = null
  if (level) await fill(level)
}

async function fill(level: EnglishLevel) {
  filling.value = level
  error.value = null
  fillSummary.value = null
  fillDone.value = 0
  fillTotal.value = 0
  let approved = 0
  let review = 0
  try {
    const { added } = await importBankWords(level)
    for (;;) {
      const progress = await processBankBatch(level)
      approved += progress.approved
      review += progress.sent_to_review
      fillDone.value += progress.processed
      fillTotal.value = fillDone.value + progress.remaining
      if (progress.remaining === 0) break
    }
    fillSummary.value =
      fillDone.value === 0
        ? `${level}: nothing new to fill.`
        : `${level}: ${added} words added, ${approved} approved, ${review} sent to review.`
  } catch (err) {
    error.value = `${message(err, 'The fill stopped.')} Click "Fill bank" again to resume.`
  } finally {
    filling.value = null
    await loadLevels()
    if (level === wordsLevel.value) await loadWords()
  }
}

const fillPercent = computed(() =>
  fillTotal.value ? Math.round((fillDone.value / fillTotal.value) * 100) : 0,
)

// --- Curacion ---

const wordsLevel = ref<EnglishLevel>('A1')
const wordsStatus = ref<EnglishWordStatus | ''>('')
const words = ref<EnglishWordAdmin[]>([])
const wordsTotal = ref(0)
const wordsLoading = ref(false)
const busyWord = ref<number | null>(null)

const STATUS_FILTERS: { value: EnglishWordStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'PENDING', label: 'Pending' },
]

async function loadWords(append = false) {
  wordsLoading.value = true
  try {
    const page = await listBankWords(wordsLevel.value, {
      status: wordsStatus.value || null,
      offset: append ? words.value.length : 0,
      limit: PAGE_SIZE,
    })
    words.value = append ? [...words.value, ...page.items] : page.items
    wordsTotal.value = page.total
  } catch (err) {
    error.value = message(err, 'Could not load the words.')
  } finally {
    wordsLoading.value = false
  }
}

watch([wordsLevel, wordsStatus], () => loadWords())

function replace(updated: EnglishWordAdmin) {
  words.value = words.value.map((word) => (word.id === updated.id ? updated : word))
}

async function changeImage(word: EnglishWordAdmin) {
  busyWord.value = word.id
  error.value = null
  try {
    replace(await nextBankImage(word.id))
  } catch (err) {
    error.value = message(err, 'Could not change the image.')
  } finally {
    busyWord.value = null
  }
}

async function toggleWord(word: EnglishWordAdmin) {
  busyWord.value = word.id
  error.value = null
  try {
    replace(await setBankWordStatus(word.id, word.status === 'DISABLED' ? 'APPROVED' : 'DISABLED'))
    await loadLevels()
  } catch (err) {
    error.value = message(err, 'Could not update the word.')
  } finally {
    busyWord.value = null
  }
}

const STATUS_TONE: Record<EnglishWordStatus, 'neutral' | 'accent' | 'ruby'> = {
  APPROVED: 'accent',
  REVIEW: 'ruby',
  DISABLED: 'neutral',
  PENDING: 'neutral',
}

onMounted(async () => {
  await Promise.all([loadLevels(), loadWords()])
})
</script>

<template>
  <div class="space-y-6">
    <p v-if="error" class="text-sm text-ruby-text" data-test="bank-error">{{ error }}</p>

    <BaseCard title="Bank by level">
      <p class="mb-4 text-sm text-muted">
        Shared by every user. Each fill adds up to 100 words from the CEFR-J list, finds a picture
        and writes the practice texts with AI. Filling again only completes what is missing.
      </p>
      <ul class="divide-y divide-subtle">
        <li
          v-for="row in levels"
          :key="row.level"
          class="flex flex-wrap items-center gap-3 py-3"
          :data-test="`level-${row.level}`"
        >
          <span class="w-8 text-sm font-semibold text-foreground">{{ row.level }}</span>
          <div class="min-w-0 flex-1 text-sm">
            <p class="text-foreground">
              {{ row.approved }} ready
              <span class="text-muted">· {{ row.imported }} / {{ row.list_total }} imported</span>
            </p>
            <p v-if="row.review || row.disabled" class="text-xs text-muted">
              <span v-if="row.review">{{ row.review }} in review</span>
              <span v-if="row.review && row.disabled"> · </span>
              <span v-if="row.disabled">{{ row.disabled }} disabled</span>
            </p>
            <div v-if="filling === row.level" class="mt-2">
              <div class="h-1.5 rounded-full bg-surface-hover">
                <div
                  class="h-1.5 rounded-full bg-accent-text transition-all"
                  :style="{ width: `${fillPercent}%` }"
                />
              </div>
              <p class="mt-1 text-xs text-muted" data-test="fill-progress">
                Filling... {{ fillDone }} / {{ fillTotal || '?' }}
              </p>
            </div>
          </div>
          <BaseBadge v-if="row.full" tone="accent">Full</BaseBadge>
          <BaseButton
            variant="secondary"
            :disabled="filling !== null"
            :data-test="`fill-${row.level}`"
            @click="requestFill(row)"
          >
            {{ filling === row.level ? 'Filling...' : 'Fill bank' }}
          </BaseButton>
        </li>
      </ul>
      <p v-if="fillSummary" class="mt-3 text-sm text-foreground" data-test="fill-summary">
        {{ fillSummary }}
      </p>
    </BaseCard>

    <BaseCard title="Words">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <div class="flex gap-1" role="tablist" aria-label="Level">
          <button
            v-for="level in ENGLISH_LEVELS"
            :key="level"
            type="button"
            role="tab"
            :aria-selected="wordsLevel === level"
            class="rounded-lg px-3 py-1 text-sm font-medium transition-colors"
            :class="
              wordsLevel === level
                ? 'bg-accent/10 text-accent-text'
                : 'text-muted hover:bg-surface-hover hover:text-foreground'
            "
            @click="wordsLevel = level"
          >
            {{ level }}
          </button>
        </div>
        <select
          v-model="wordsStatus"
          aria-label="Status"
          class="ml-auto rounded-lg border border-subtle bg-surface px-2 py-1 text-sm"
        >
          <option v-for="option in STATUS_FILTERS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <p v-if="!wordsLoading && !words.length" class="text-sm text-muted">
        No words here yet. Use "Fill bank" above.
      </p>

      <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <li
          v-for="word in words"
          :key="word.id"
          class="flex flex-col overflow-hidden rounded-lg border border-subtle"
          data-test="bank-word"
        >
          <div class="flex aspect-square items-center justify-center bg-white">
            <img
              v-if="word.image"
              :src="word.image.url"
              :alt="word.lemma"
              :title="word.image.attribution"
              loading="lazy"
              class="h-full w-full object-contain"
            />
            <ImageOff v-else class="h-6 w-6 text-muted" />
          </div>
          <div class="flex flex-1 flex-col gap-1 p-2">
            <div class="flex items-center justify-between gap-1">
              <span class="truncate text-sm font-medium text-foreground">{{ word.lemma }}</span>
              <BaseBadge :tone="STATUS_TONE[word.status]">{{
                word.status.toLowerCase()
              }}</BaseBadge>
            </div>
            <p class="text-xs text-muted">
              {{ word.pos
              }}<template v-if="word.status_reason"> · {{ word.status_reason }}</template>
            </p>
            <div class="mt-auto flex gap-1 pt-1">
              <button
                v-if="word.image"
                type="button"
                class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
                :disabled="busyWord === word.id"
                data-test="next-image"
                @click="changeImage(word)"
              >
                <RefreshCw class="h-3 w-3" /> Image
              </button>
              <button
                type="button"
                class="ml-auto rounded px-1.5 py-0.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
                :disabled="busyWord === word.id"
                data-test="toggle-word"
                @click="toggleWord(word)"
              >
                {{ word.status === 'DISABLED' ? 'Enable' : 'Disable' }}
              </button>
            </div>
          </div>
        </li>
      </ul>

      <div v-if="words.length < wordsTotal" class="mt-4 text-center">
        <BaseButton variant="ghost" :disabled="wordsLoading" @click="loadWords(true)">
          Show more ({{ wordsTotal - words.length }} left)
        </BaseButton>
      </div>
    </BaseCard>

    <ConfirmDialog
      :open="confirmLevel !== null"
      title="This bank is already full"
      confirm-label="Fill again"
      @close="confirmLevel = null"
      @confirm="confirmFill"
    >
      Every word of {{ confirmLevel }} in the list is already in the bank. Fill it again? It only
      retries what is missing.
    </ConfirmDialog>
  </div>
</template>
