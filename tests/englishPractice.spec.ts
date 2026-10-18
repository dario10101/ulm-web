import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePractice } from '@/composables/usePractice'
import { checkAnswer, letterSlots, practiceTexts } from '@/lib/englishPractice'
import {
  getEnglishSettings,
  getNextPractice,
  savePractice,
  setPracticeMastered,
} from '@/services/englishApi'
import type { EnglishPractice, EnglishSettings } from '@/types/english'

import ListeningStep from '../src/components/english/ListeningStep.vue'
import VocabularyStep from '../src/components/english/VocabularyStep.vue'
import WritingStep from '../src/components/english/WritingStep.vue'
import EnglishPage from '../src/views/admin/EnglishPage.vue'

vi.mock('@/services/englishApi', () => ({
  getEnglishSettings: vi.fn(),
  setEnglishLevel: vi.fn(),
  getNextPractice: vi.fn(),
  savePractice: vi.fn(),
  setPracticeMastered: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

export const PRACTICE: EnglishPractice = {
  word_id: 3,
  content_id: 9,
  level: 'A1',
  lemma: 'ice cream',
  accepted_answers: [],
  pos: 'noun',
  image: {
    url: 'https://img.example/ice.png',
    source: 'arasaac',
    license: 'CC BY-NC-SA 4.0',
    attribution: 'ARASAAC',
    page_url: null,
  },
  listening_sentence: 'I eat ice cream in summer.',
  writing_prompt: 'Write when you eat ice cream.',
  writing_prompt_es: 'Escribe cuándo comes helado.',
  reading_text: 'I eat ice cream in summer. It is cold. Do you like it?',
  reading_question: 'Do you like it?',
  mastered_repeat: false,
  config: {
    first_letter_hint: true,
    tts_rate: 0.8,
    writing_min_chars: 10,
    free_speaking_seconds: 30,
    instructions_lang: 'es',
  },
}

const SETTINGS: EnglishSettings = {
  level: 'A1',
  levels: [{ level: 'A1', ready_words: 10, available: true }],
  level_completed: false,
}

const texts = practiceTexts('en')

beforeEach(() => {
  vi.mocked(getNextPractice).mockReset().mockResolvedValue(structuredClone(PRACTICE))
  vi.mocked(savePractice)
    .mockReset()
    .mockResolvedValue({ id: 50, mastered: false, was_mastered: false })
  vi.mocked(setPracticeMastered)
    .mockReset()
    .mockResolvedValue({ id: 50, mastered: true, was_mastered: false })
  vi.mocked(getEnglishSettings).mockReset().mockResolvedValue(structuredClone(SETTINGS))
})

// --- Logica pura ---

describe('englishPractice lib', () => {
  it('builds one slot per letter with fixed spaces and hyphens', () => {
    expect(letterSlots('t-shirt').filter((slot) => slot.fixed)).toEqual([
      { fixed: true, char: '-' },
    ])
    expect(letterSlots('ice cream').map((slot) => slot.fixed)).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    ])
  })

  it('accepts the word and its synonyms, ignoring case', () => {
    expect(checkAnswer('Apple', 'apple', [])).toBe('correct')
    expect(checkAnswer('couch', 'sofas', ['couch'])).toBe('synonym')
    expect(checkAnswer('aplle', 'apple', [])).toBe('wrong')
  })
})

// --- Maquina de estados ---

describe('usePractice', () => {
  it('goes through the steps and saves the whole practice at the closing', async () => {
    const flow = usePractice({ speaking: false })
    await flow.start()
    expect(flow.step.value).toBe('vocabulary')

    flow.completeVocabulary({ revealed: true, usedSynonym: false })
    flow.completeListening(true)
    await flow.completeWriting('  I eat it in summer.  ')

    expect(flow.step.value).toBe('closing')
    expect(savePractice).toHaveBeenCalledWith({
      word_id: 3,
      content_id: 9,
      vocab_revealed: true,
      vocab_used_synonym: false,
      listening_text_shown: true,
      writing_text: 'I eat it in summer.',
      reading_transcript: null,
      reading_match_pct: null,
      free_transcript: null,
      speaking_skipped: true,
      audio_seconds: 0,
      // Revelo la palabra: el check arranca desmarcado.
      mastered: false,
    })

    await flow.setMastered(true)
    expect(setPracticeMastered).toHaveBeenCalledWith(50, true)
    expect(flow.mastered.value).toBe(true)
  })

  it('starts the check marked when the word was guessed', async () => {
    const flow = usePractice({ speaking: false })
    await flow.start()
    flow.completeVocabulary({ revealed: false, usedSynonym: false })
    flow.completeListening(false)
    await flow.completeWriting('I eat it in summer.')

    expect(vi.mocked(savePractice).mock.calls[0][0].mastered).toBe(true)
  })

  it('shows the error when there is no practice to load', async () => {
    vi.mocked(getNextPractice).mockRejectedValue(new Error('boom'))
    const flow = usePractice()

    await flow.start()

    expect(flow.step.value).toBe('error')
    expect(flow.error.value).toBe('Could not load a practice.')
  })
})

// --- Pasos ---

async function typeWord(wrapper: ReturnType<typeof mount>, word: string) {
  const inputs = wrapper.findAll('[data-test="vocab-letter"]')
  const letters = [...word].filter((char) => char !== ' ' && char !== '-')
  for (const [i, input] of inputs.entries()) {
    await input.setValue(letters[i] ?? '')
  }
}

describe('VocabularyStep', () => {
  it('validates by itself when every box is filled', async () => {
    const wrapper = mount(VocabularyStep, { props: { practice: PRACTICE, texts } })

    expect(wrapper.findAll('[data-test="vocab-letter"]')).toHaveLength(8)
    expect(wrapper.find('[data-test="vocab-letter"]').attributes('placeholder')).toBe('i')
    await typeWord(wrapper, 'icecraam')
    expect(wrapper.find('[data-test="vocab-feedback"]').text()).toBe(texts.wrong)
    expect(wrapper.find('[data-test="continue"]').exists()).toBe(false)

    await typeWord(wrapper, 'icecream')
    expect(wrapper.find('[data-test="vocab-feedback"]').text()).toBe(texts.correct)
    await wrapper.find('[data-test="continue"]').trigger('click')

    expect(wrapper.emitted('complete')).toEqual([[{ revealed: false, usedSynonym: false }]])
  })

  it('reveals the word and lets the user continue', async () => {
    const wrapper = mount(VocabularyStep, { props: { practice: PRACTICE, texts } })

    await wrapper.find('[data-test="show-word"]').trigger('click')
    await wrapper.find('[data-test="continue"]').trigger('click')

    expect(wrapper.emitted('complete')).toEqual([[{ revealed: true, usedSynonym: false }]])
  })

  it('accepts a synonym and shows the target word', async () => {
    const practice = { ...PRACTICE, lemma: 'sofa', accepted_answers: ['divn'] }
    const wrapper = mount(VocabularyStep, { props: { practice, texts } })

    await typeWord(wrapper, 'divn')

    expect(wrapper.find('[data-test="vocab-feedback"]').text()).toContain('sofa')
    await wrapper.find('[data-test="continue"]').trigger('click')
    expect(wrapper.emitted('complete')).toEqual([[{ revealed: false, usedSynonym: true }]])
  })
})

describe('ListeningStep', () => {
  let utterances: { onend: (() => void) | null; rate: number }[]

  beforeEach(() => {
    utterances = []
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        onend: (() => void) | null = null
        onerror: (() => void) | null = null
        rate = 1
        lang = ''
        voice = null
        constructor(public text: string) {
          utterances.push(this)
        }
      },
    )
    vi.stubGlobal('speechSynthesis', { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [] })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('enables continue and show text only after listening', async () => {
    const wrapper = mount(ListeningStep, { props: { practice: PRACTICE, texts } })
    expect(wrapper.find('[data-test="continue"]').exists()).toBe(false)

    await wrapper.find('[data-test="play"]').trigger('click')
    expect(utterances[0].rate).toBe(0.8)
    utterances[0].onend!()
    await flushPromises()

    await wrapper.find('[data-test="show-text"]').trigger('click')
    expect(wrapper.find('[data-test="listening-text"]').text()).toBe(PRACTICE.listening_sentence)
    await wrapper.find('[data-test="continue"]').trigger('click')
    expect(wrapper.emitted('complete')).toEqual([[true]])
  })
})

describe('WritingStep', () => {
  it('enables continue once the minimum is reached and shows the Spanish prompt', async () => {
    const wrapper = mount(WritingStep, { props: { practice: PRACTICE, texts } })

    expect(wrapper.find('[data-test="writing-prompt-es"]').text()).toBe(PRACTICE.writing_prompt_es)
    await wrapper.find('textarea').setValue('too short')
    expect(wrapper.find('[data-test="continue"]').attributes('disabled')).toBeDefined()

    await wrapper.find('textarea').setValue('long enough now')
    expect(wrapper.find('[data-test="continue"]').attributes('disabled')).toBeUndefined()
    await wrapper.find('[data-test="continue"]').trigger('click')
    expect(wrapper.emitted('complete')).toEqual([['long enough now']])
  })
})

// --- Pagina ---

const stubs = { RouterLink: { template: '<a><slot /></a>' } }

describe('EnglishPage', () => {
  it('asks to choose a level when there is none', async () => {
    vi.mocked(getEnglishSettings).mockResolvedValue({ ...SETTINGS, level: null })

    const wrapper = mount(EnglishPage, { global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Choose your level first')
    expect(getNextPractice).not.toHaveBeenCalled()
  })

  it('starts a practice at the vocabulary step with the Spanish instructions', async () => {
    const wrapper = mount(EnglishPage, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-test="current-level"]').text()).toBe('A1')
    expect(wrapper.find('[data-test="vocab-image"]').attributes('src')).toBe(PRACTICE.image!.url)
    expect(wrapper.text()).toContain(practiceTexts('es').vocabularyInstruction)
  })
})
