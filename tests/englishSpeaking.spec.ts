import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePractice } from '@/composables/usePractice'
import { practiceTexts } from '@/lib/englishPractice'
import { MicrophoneError, startRecording } from '@/lib/recorder'
import { getNextPractice, savePractice, transcribeSpeech } from '@/services/englishApi'
import type { EnglishPractice } from '@/types/english'

import SpeakingStep from '../src/components/english/SpeakingStep.vue'

vi.mock('@/lib/recorder', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/recorder')>()),
  recordingSupported: () => true,
  startRecording: vi.fn(),
}))

vi.mock('@/services/englishApi', () => ({
  getNextPractice: vi.fn(),
  savePractice: vi.fn(),
  setPracticeMastered: vi.fn(),
  transcribeSpeech: vi.fn(),
}))

const PRACTICE: EnglishPractice = {
  word_id: 3,
  content_id: 9,
  level: 'B1',
  lemma: 'dog',
  accepted_answers: [],
  pos: 'noun',
  image: null,
  listening_sentence: 'The big dog runs fast.',
  writing_prompt: 'Write about a dog.',
  writing_prompt_es: null,
  reading_text: 'The big dog runs fast. It likes the park. Do you have a pet?',
  reading_question: 'Do you have a pet?',
  hint: null,
  mastered_repeat: false,
  config: {
    first_letter_hint: false,
    tts_rate: 1,
    writing_min_chars: 5,
    free_speaking_seconds: 60,
    instructions_lang: 'en',
  },
}

const texts = practiceTexts('en')

function fakeRecording(seconds: number) {
  return {
    stop: vi.fn().mockResolvedValue({
      blob: new Blob(['x'], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      seconds,
    }),
    cancel: vi.fn(),
  }
}

beforeEach(() => {
  vi.mocked(startRecording).mockReset()
  vi.mocked(transcribeSpeech).mockReset()
})

describe('SpeakingStep', () => {
  it('records the reading, shows the comparison and then the free speaking', async () => {
    vi.mocked(startRecording)
      .mockResolvedValueOnce(fakeRecording(8))
      .mockResolvedValueOnce(fakeRecording(20))
    vi.mocked(transcribeSpeech)
      .mockResolvedValueOnce({
        transcript: 'the dog run fast',
        duration_seconds: 8,
        match_pct: 60,
        diff: [
          { kind: 'equal', expected: ['the'], said: ['the'] },
          { kind: 'missing', expected: ['big'], said: [] },
          { kind: 'equal', expected: ['dog'], said: ['dog'] },
          { kind: 'changed', expected: ['runs'], said: ['run'] },
          { kind: 'equal', expected: ['fast'], said: ['fast'] },
        ],
      })
      .mockResolvedValueOnce({
        transcript: 'Yes I have a cat',
        duration_seconds: 20,
        match_pct: null,
        diff: null,
      })
    const wrapper = mount(SpeakingStep, { props: { practice: PRACTICE, texts } })

    expect(wrapper.find('[data-test="reading-text"]').text()).toBe(PRACTICE.reading_text)
    await wrapper.find('[data-test="record"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="stop"]').trigger('click')
    await flushPromises()

    expect(vi.mocked(transcribeSpeech).mock.calls[0][0]).toMatchObject({
      contentId: 9,
      phase: 'reading',
      seconds: 8,
    })
    expect(wrapper.find('[data-test="match"]').text()).toContain('60%')
    expect(wrapper.findAll('[data-test="diff-expected"]').map((w) => w.text())).toEqual([
      'big',
      'runs',
    ])

    await wrapper.find('[data-test="continue"]').trigger('click')
    expect(wrapper.find('[data-test="reading-question"]').text()).toBe('Do you have a pet?')

    await wrapper.find('[data-test="record"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="stop"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="transcript"]').text()).toBe('Yes I have a cat')
    expect(vi.mocked(transcribeSpeech).mock.calls[1][0].phase).toBe('free')

    await wrapper.find('[data-test="continue"]').trigger('click')
    expect(wrapper.emitted('complete')).toEqual([
      [
        {
          readingTranscript: 'the dog run fast',
          readingMatchPct: 60,
          freeTranscript: 'Yes I have a cat',
          audioSeconds: 28,
          skipped: false,
        },
      ],
    ])
  })

  it('lets the user skip when the microphone is denied', async () => {
    vi.mocked(startRecording).mockRejectedValue(new MicrophoneError('denied'))
    const wrapper = mount(SpeakingStep, { props: { practice: PRACTICE, texts } })

    await wrapper.find('[data-test="record"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="mic-problem"]').text()).toContain(texts.micDenied)
    await wrapper.find('[data-test="skip-speaking"]').trigger('click')
    expect(wrapper.emitted('complete')![0][0]).toMatchObject({ skipped: true, audioSeconds: 0 })
    expect(transcribeSpeech).not.toHaveBeenCalled()
  })

  it('shows the transcription error and allows recording again', async () => {
    vi.mocked(startRecording).mockResolvedValue(fakeRecording(5))
    vi.mocked(transcribeSpeech).mockRejectedValue(new Error('down'))
    const wrapper = mount(SpeakingStep, { props: { practice: PRACTICE, texts } })

    await wrapper.find('[data-test="record"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="stop"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Could not transcribe the audio.')
    expect(wrapper.find('[data-test="record"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-test="continue"]').exists()).toBe(false)
  })
})

describe('usePractice with speaking', () => {
  it('goes from writing to speaking and saves the speaking results', async () => {
    vi.mocked(getNextPractice).mockResolvedValue(structuredClone(PRACTICE))
    vi.mocked(savePractice).mockResolvedValue({ id: 1, mastered: true, was_mastered: false })
    const flow = usePractice()
    await flow.start()
    flow.completeVocabulary({ revealed: false, usedSynonym: false })
    flow.completeListening(false)
    await flow.completeWriting({ dictation: 'The big dog', answer: 'I like dogs.' })
    expect(flow.step.value).toBe('speaking')

    await flow.completeSpeaking({
      readingTranscript: 'the dog',
      readingMatchPct: 40,
      freeTranscript: 'yes',
      audioSeconds: 12,
      skipped: false,
    })

    expect(flow.step.value).toBe('closing')
    expect(vi.mocked(savePractice).mock.calls[0][0]).toMatchObject({
      reading_transcript: 'the dog',
      reading_match_pct: 40,
      free_transcript: 'yes',
      audio_seconds: 12,
      speaking_skipped: false,
      mastered: true,
    })
  })
})
