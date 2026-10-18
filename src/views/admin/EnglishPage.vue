<script setup lang="ts">
import { Settings2 } from '@lucide/vue'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'

import ClosingStep from '@/components/english/ClosingStep.vue'
import ListeningStep from '@/components/english/ListeningStep.vue'
import SpeakingStep from '@/components/english/SpeakingStep.vue'
import VocabularyStep from '@/components/english/VocabularyStep.vue'
import WritingStep from '@/components/english/WritingStep.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { usePractice } from '@/composables/usePractice'
import { practiceTexts } from '@/lib/englishPractice'
import { ApiError } from '@/lib/http'
import { getEnglishSettings } from '@/services/englishApi'
import type { EnglishSettings } from '@/types/english'

/**
 * Pagina de estudio de ingles (ENGLISH-TEACHER-PLAN.md, seccion 3): una
 * practica por palabra, vocabulario -> listening -> writing -> speaking ->
 * cierre. El
 * nivel se elige en Settings -> English (boton arriba a la derecha).
 */
const router = useRouter()
const settings = shallowRef<EnglishSettings | null>(null)
const settingsError = ref<string | null>(null)

const flow = usePractice()
const { step, stepIndex, practice, mastered, saving, error } = flow

const lang = computed(() => practice.value?.config.instructions_lang ?? 'en')
const texts = computed(() => practiceTexts(lang.value))
const steps = computed(() => [
  texts.value.stepVocabulary,
  texts.value.stepListening,
  texts.value.stepWriting,
  ...(flow.speakingEnabled ? [texts.value.stepSpeaking] : []),
])

onMounted(async () => {
  try {
    settings.value = await getEnglishSettings()
  } catch (err) {
    settingsError.value = err instanceof ApiError ? err.message : 'Could not load your level.'
    return
  }
  if (settings.value.level) await flow.start()
})

function finish() {
  router.push({ name: 'admin-dashboard' })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-foreground">English practice</h1>
        <p class="text-sm text-muted">
          One word at a time: vocabulary, listening, writing and speaking.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <BaseBadge v-if="settings?.level" tone="accent" data-test="current-level">
          {{ settings.level }}
        </BaseBadge>
        <RouterLink
          :to="{ name: 'admin-settings', params: { section: 'english' } }"
          class="inline-flex items-center gap-1.5 rounded-lg border border-subtle px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-accent-text/50"
          data-test="level-settings"
        >
          <Settings2 class="h-4 w-4 text-muted" /> Level
        </RouterLink>
      </div>
    </div>

    <p v-if="settingsError" role="alert" class="text-sm text-ruby-text">{{ settingsError }}</p>

    <BaseCard v-else-if="settings && !settings.level" title="Choose your level first">
      <p class="mb-4 text-sm text-muted">
        The difficulty of every step depends on your English level. / La dificultad de cada paso
        depende de tu nivel de inglés.
      </p>
      <RouterLink :to="{ name: 'admin-settings', params: { section: 'english' } }">
        <BaseButton>Choose level</BaseButton>
      </RouterLink>
    </BaseCard>

    <template v-else-if="settings">
      <p
        v-if="settings.level_completed"
        class="rounded-lg bg-accent/10 px-4 py-2 text-sm text-accent-text"
        data-test="level-completed"
      >
        You know every word of {{ settings.level }}: words you mastered will repeat. Consider moving
        up a level.
      </p>

      <BaseCard>
        <ol
          v-if="stepIndex >= 0"
          class="mb-6 flex flex-wrap gap-2 text-xs font-medium"
          aria-label="Steps"
        >
          <li
            v-for="(label, index) in steps"
            :key="label"
            class="rounded-full px-3 py-1"
            :class="
              index === stepIndex
                ? 'bg-accent/15 text-accent-text'
                : index < stepIndex
                  ? 'text-success-text'
                  : 'text-muted'
            "
          >
            {{ index + 1 }}. {{ label }}
          </li>
        </ol>

        <p v-if="step === 'loading'" class="py-10 text-center text-sm text-muted">Loading...</p>

        <div v-else-if="step === 'error'" class="space-y-3 py-6 text-center">
          <p role="alert" class="text-sm text-ruby-text" data-test="practice-error">{{ error }}</p>
          <BaseButton variant="secondary" @click="flow.start()">Try again</BaseButton>
        </div>

        <template v-else-if="practice">
          <VocabularyStep
            v-if="step === 'vocabulary'"
            :key="`v-${practice.word_id}`"
            :practice="practice"
            :texts="texts"
            @complete="flow.completeVocabulary"
          />
          <ListeningStep
            v-else-if="step === 'listening'"
            :practice="practice"
            :texts="texts"
            @complete="flow.completeListening"
          />
          <WritingStep
            v-else-if="step === 'writing'"
            :practice="practice"
            :texts="texts"
            @complete="flow.completeWriting"
          />
          <SpeakingStep
            v-else-if="step === 'speaking'"
            :practice="practice"
            :texts="texts"
            @complete="flow.completeSpeaking"
          />
          <template v-else-if="step === 'closing'">
            <ClosingStep
              :texts="texts"
              :mastered="mastered"
              :mastered-repeat="practice.mastered_repeat"
              :saving="saving"
              :feedback-enabled="false"
              @update:mastered="flow.setMastered"
              @finish="finish"
              @new-practice="flow.start()"
            />
            <div v-if="error" class="mt-4 space-y-2 text-center">
              <p role="alert" class="text-sm text-ruby-text" data-test="save-error">{{ error }}</p>
              <BaseButton v-if="!flow.saved.value" variant="secondary" @click="flow.persist()">
                Retry saving
              </BaseButton>
            </div>
          </template>
        </template>
      </BaseCard>
    </template>
  </div>
</template>
