<script setup lang="ts">
import { CheckCircle2 } from '@lucide/vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import type { PracticeTexts } from '@/lib/englishPractice'

/**
 * Cierre: el check "la domino" (marcado por defecto si no revelo la palabra;
 * oculto si la palabra ya estaba dominada, D20) y las tres salidas.
 */
defineProps<{
  texts: PracticeTexts
  mastered: boolean
  masteredRepeat: boolean
  saving: boolean
  feedbackEnabled: boolean
}>()
const emit = defineEmits<{
  'update:mastered': [value: boolean]
  finish: []
  newPractice: []
  feedback: []
}>()
</script>

<template>
  <div class="space-y-5 text-center">
    <CheckCircle2 class="mx-auto h-10 w-10 text-success-text" />
    <h2 class="text-lg font-semibold text-foreground">{{ texts.closingTitle }}</h2>

    <p v-if="masteredRepeat" class="text-sm text-muted" data-test="mastered-repeat">
      {{ texts.masteredRepeat }}
    </p>
    <label
      v-else
      class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-subtle px-3 py-2 text-sm text-foreground"
    >
      <input
        type="checkbox"
        :checked="mastered"
        class="h-4 w-4 rounded border-subtle accent-cta"
        data-test="mastered"
        @change="emit('update:mastered', ($event.target as HTMLInputElement).checked)"
      />
      {{ texts.masteredLabel }}
    </label>

    <p v-if="saving" class="text-xs text-muted">{{ texts.saving }}</p>

    <div class="flex flex-wrap justify-center gap-2">
      <BaseButton variant="ghost" data-test="finish" @click="emit('finish')">
        {{ texts.finish }}
      </BaseButton>
      <BaseButton variant="secondary" data-test="new-practice" @click="emit('newPractice')">
        {{ texts.newPractice }}
      </BaseButton>
      <BaseButton
        v-if="feedbackEnabled"
        :disabled="saving"
        data-test="feedback"
        @click="emit('feedback')"
      >
        {{ texts.feedback }}
      </BaseButton>
    </div>
  </div>
</template>
