<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { checkAnswer, letterSlots, type PracticeTexts } from '@/lib/englishPractice'
import type { EnglishPractice } from '@/types/english'

/**
 * Paso 1: imagen sin la palabra escrita; una casilla por letra. Al completar
 * todas se valida sola, sin boton (D9: sin tiempo limite ni registro de
 * intentos). Mientras no este bien se puede ver la palabra; bien o revelada,
 * se habilita continuar.
 */
const props = defineProps<{ practice: EnglishPractice; texts: PracticeTexts }>()
const emit = defineEmits<{ complete: [outcome: { revealed: boolean; usedSynonym: boolean }] }>()

type State = 'typing' | 'wrong' | 'correct' | 'synonym' | 'revealed'

const slots = computed(() => letterSlots(props.practice.lemma))
const letters = ref<string[]>(slots.value.map((slot) => (slot.fixed ? slot.char : '')))
const state = ref<State>('typing')
const inputs = ref<HTMLInputElement[]>([])

const done = computed(() => ['correct', 'synonym', 'revealed'].includes(state.value))
const firstEditable = computed(() => slots.value.findIndex((slot) => !slot.fixed))
const typed = computed(() => letters.value.join(''))
const complete = computed(() => letters.value.every((letter) => letter !== ''))

watch(typed, () => {
  if (done.value) return
  if (!complete.value) {
    state.value = 'typing'
    return
  }
  const result = checkAnswer(typed.value, props.practice.lemma, props.practice.accepted_answers)
  state.value = result === 'wrong' ? 'wrong' : result
})

function focusSlot(index: number) {
  void nextTick(() => inputs.value[index]?.focus())
}

function nextEditable(from: number, direction: 1 | -1): number {
  for (let i = from + direction; i >= 0 && i < slots.value.length; i += direction) {
    if (!slots.value[i].fixed) return i
  }
  return -1
}

function onInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const char = input.value
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .slice(-1)
  letters.value[index] = char
  input.value = char
  if (char) {
    const next = nextEditable(index, 1)
    if (next >= 0) focusSlot(next)
  }
}

function onKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !letters.value[index]) {
    const previous = nextEditable(index, -1)
    if (previous >= 0) {
      letters.value[previous] = ''
      focusSlot(previous)
    }
    event.preventDefault()
  } else if (event.key === 'ArrowLeft') {
    const previous = nextEditable(index, -1)
    if (previous >= 0) focusSlot(previous)
  } else if (event.key === 'ArrowRight') {
    const next = nextEditable(index, 1)
    if (next >= 0) focusSlot(next)
  }
}

function onPaste(index: number, event: ClipboardEvent) {
  event.preventDefault()
  const chars = [
    ...(event.clipboardData?.getData('text') ?? '').toLowerCase().replace(/[^a-z]/g, ''),
  ]
  let target = index
  for (const char of chars) {
    if (target < 0) break
    letters.value[target] = char
    target = nextEditable(target, 1)
  }
}

function reveal() {
  letters.value = [...props.practice.lemma]
  state.value = 'revealed'
}

function proceed() {
  emit('complete', { revealed: state.value === 'revealed', usedSynonym: state.value === 'synonym' })
}

focusSlot(firstEditable.value)
</script>

<template>
  <div class="space-y-5">
    <p class="text-sm text-muted">{{ texts.vocabularyInstruction }}</p>

    <figure class="mx-auto max-w-xs">
      <div
        class="flex aspect-square items-center justify-center rounded-xl border border-subtle bg-white p-3"
      >
        <img
          v-if="practice.image"
          :src="practice.image.url"
          alt="Picture to name in English"
          class="h-full w-full object-contain"
          data-test="vocab-image"
        />
      </div>
      <figcaption v-if="practice.image" class="mt-1 text-[10px] leading-tight text-muted">
        <a
          v-if="practice.image.page_url"
          :href="practice.image.page_url"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:underline"
          >{{ practice.image.attribution }}</a
        >
        <span v-else>{{ practice.image.attribution }}</span>
      </figcaption>
    </figure>

    <p class="text-center text-xs uppercase tracking-wide text-muted" data-test="vocab-pos">
      {{ practice.pos }}
    </p>
    <p v-if="practice.pos === 'verb'" class="text-center text-xs text-muted">
      {{ texts.verbHint }}
    </p>

    <div class="flex flex-wrap justify-center gap-1.5" data-test="vocab-slots">
      <template v-for="(slot, index) in slots" :key="index">
        <span v-if="slot.fixed" class="flex h-11 w-4 items-center justify-center text-muted">
          {{ slot.char === '-' ? '-' : '' }}
        </span>
        <input
          v-else
          :ref="(el) => (inputs[index] = el as HTMLInputElement)"
          :value="letters[index]"
          :placeholder="
            practice.config.first_letter_hint && index === firstEditable
              ? practice.lemma[index]
              : ''
          "
          :disabled="done"
          maxlength="2"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :aria-label="`Letter ${index + 1}`"
          class="h-11 w-9 rounded-lg border bg-surface text-center text-lg font-semibold lowercase text-foreground outline-none transition-colors placeholder:text-muted/50 focus:border-accent-text"
          :class="{
            'border-subtle': state === 'typing',
            'border-rose-500 dark:border-rose-400': state === 'wrong',
            'border-success': state === 'correct' || state === 'synonym',
            'border-accent-text': state === 'revealed',
          }"
          data-test="vocab-letter"
          @input="onInput(index, $event)"
          @keydown="onKeydown(index, $event)"
          @paste="onPaste(index, $event)"
        />
      </template>
    </div>

    <p class="min-h-5 text-center text-sm" role="status" data-test="vocab-feedback">
      <span v-if="state === 'correct'" class="text-success-text">{{ texts.correct }}</span>
      <span v-else-if="state === 'synonym'" class="text-success-text">
        {{ texts.synonym }} <strong>{{ practice.lemma }}</strong
        >.
      </span>
      <span v-else-if="state === 'wrong'" class="text-rose-600 dark:text-rose-400">
        {{ texts.wrong }}
      </span>
    </p>

    <div class="flex justify-center gap-2">
      <BaseButton v-if="!done" variant="secondary" data-test="show-word" @click="reveal">
        {{ texts.showWord }}
      </BaseButton>
      <BaseButton v-else data-test="continue" @click="proceed">{{ texts.continue }}</BaseButton>
    </div>
  </div>
</template>
