<script setup lang="ts">
import type { PracticeTexts } from '@/lib/englishPractice'
import type { EnglishCorrection, EnglishFeedback } from '@/types/english'

/**
 * Feedback del LLM sobre la practica (ENGLISH-TEACHER-PLAN.md, 7.2). Texto
 * plano: nada de lo que devuelve el modelo se interpreta como HTML.
 */
defineProps<{ feedback: EnglishFeedback; texts: PracticeTexts }>()

function hasItems(items: EnglishCorrection[] | string[]): boolean {
  return items.length > 0
}
</script>

<template>
  <section class="space-y-4 text-left" data-test="feedback-panel">
    <h3 class="text-sm font-semibold text-foreground">{{ texts.feedbackTitle }}</h3>
    <p class="text-sm text-foreground" data-test="feedback-summary">{{ feedback.summary }}</p>
    <p class="text-sm text-muted">{{ feedback.vocabulary }}</p>

    <div v-if="feedback.dictation" data-test="feedback-dictation">
      <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {{ texts.feedbackDictation }}
      </h4>
      <p class="text-sm text-foreground">{{ feedback.dictation }}</p>
    </div>

    <div>
      <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {{ texts.feedbackWriting }}
      </h4>
      <ul v-if="hasItems(feedback.writing_corrections)" class="space-y-2">
        <li
          v-for="(item, index) in feedback.writing_corrections"
          :key="index"
          class="rounded-lg bg-surface-hover px-3 py-2 text-sm"
          data-test="writing-correction"
        >
          <p class="text-rose-600 line-through dark:text-rose-400" lang="en">{{ item.original }}</p>
          <p class="text-success-text" lang="en">{{ item.corrected }}</p>
          <p class="mt-1 text-xs text-muted">{{ item.explanation }}</p>
        </li>
      </ul>
      <p v-else class="text-sm text-muted">{{ texts.feedbackNoMistakes }}</p>
    </div>

    <div v-if="hasItems(feedback.reading_observations)">
      <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {{ texts.feedbackReading }}
      </h4>
      <ul class="list-disc space-y-1 pl-5 text-sm text-foreground">
        <li v-for="(item, index) in feedback.reading_observations" :key="index">{{ item }}</li>
      </ul>
    </div>

    <div>
      <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {{ texts.feedbackSpeaking }}
      </h4>
      <p
        class="mb-1 text-sm"
        :class="feedback.answered_question ? 'text-success-text' : 'text-muted'"
      >
        {{ feedback.answered_question ? texts.answeredQuestion : texts.missedQuestion }}
      </p>
      <ul v-if="hasItems(feedback.speaking_corrections)" class="space-y-2">
        <li
          v-for="(item, index) in feedback.speaking_corrections"
          :key="index"
          class="rounded-lg bg-surface-hover px-3 py-2 text-sm"
        >
          <p class="text-rose-600 line-through dark:text-rose-400" lang="en">{{ item.original }}</p>
          <p class="text-success-text" lang="en">{{ item.corrected }}</p>
          <p class="mt-1 text-xs text-muted">{{ item.explanation }}</p>
        </li>
      </ul>
    </div>

    <div v-if="hasItems(feedback.tips)">
      <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {{ texts.feedbackTips }}
      </h4>
      <ul class="list-disc space-y-1 pl-5 text-sm text-foreground" data-test="tips">
        <li v-for="(tip, index) in feedback.tips" :key="index">{{ tip }}</li>
      </ul>
    </div>
  </section>
</template>
