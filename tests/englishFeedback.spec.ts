import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePractice } from '@/composables/usePractice'
import { practiceTexts } from '@/lib/englishPractice'
import { getNextPractice, requestFeedback, savePractice } from '@/services/englishApi'
import type { EnglishFeedback, EnglishPractice } from '@/types/english'

import FeedbackPanel from '../src/components/english/FeedbackPanel.vue'

vi.mock('@/services/englishApi', () => ({
  getNextPractice: vi.fn(),
  savePractice: vi.fn(),
  setPracticeMastered: vi.fn(),
  requestFeedback: vi.fn(),
}))

const FEEDBACK: EnglishFeedback = {
  summary: 'Good job.',
  vocabulary: 'You knew the word.',
  dictation: 'You missed the article.',
  writing_corrections: [
    { original: 'I has a dog', corrected: 'I have a dog', explanation: 'Use have with I.' },
  ],
  reading_observations: [],
  speaking_corrections: [],
  answered_question: false,
  tips: ['Review have/has.'],
  model: 'gpt-6-luna',
}

const PRACTICE = {
  word_id: 1,
  content_id: 2,
  config: { writing_min_chars: 1 },
} as unknown as EnglishPractice

beforeEach(() => {
  vi.mocked(getNextPractice).mockReset().mockResolvedValue(PRACTICE)
  vi.mocked(savePractice)
    .mockReset()
    .mockResolvedValue({ id: 7, mastered: true, was_mastered: false })
  vi.mocked(requestFeedback).mockReset().mockResolvedValue(FEEDBACK)
})

async function closedPractice() {
  const flow = usePractice({ speaking: false })
  await flow.start()
  flow.completeVocabulary({ revealed: false, usedSynonym: false })
  flow.completeListening(false)
  await flow.completeWriting({ dictation: '', answer: 'I has a dog.' })
  return flow
}

describe('usePractice feedback', () => {
  it('asks the feedback of the saved practice', async () => {
    const flow = await closedPractice()

    await flow.loadFeedback()

    expect(requestFeedback).toHaveBeenCalledWith(7)
    expect(flow.feedback.value).toEqual(FEEDBACK)
  })

  it('keeps the error and allows asking again', async () => {
    vi.mocked(requestFeedback).mockRejectedValueOnce(new Error('down'))
    const flow = await closedPractice()

    await flow.loadFeedback()
    expect(flow.feedbackError.value).toBe('Could not get the feedback.')

    await flow.loadFeedback()
    expect(flow.feedback.value).toEqual(FEEDBACK)
  })

  it('a new practice clears the previous feedback', async () => {
    const flow = await closedPractice()
    await flow.loadFeedback()

    await flow.start()

    expect(flow.feedback.value).toBeNull()
  })
})

describe('FeedbackPanel', () => {
  it('shows corrections, tips and whether the question was answered', () => {
    const texts = practiceTexts('en')
    const wrapper = mount(FeedbackPanel, { props: { feedback: FEEDBACK, texts } })

    expect(wrapper.find('[data-test="feedback-summary"]').text()).toBe('Good job.')
    const correction = wrapper.find('[data-test="writing-correction"]')
    expect(correction.text()).toContain('I has a dog')
    expect(correction.text()).toContain('I have a dog')
    expect(wrapper.find('[data-test="tips"]').text()).toBe('Review have/has.')
    expect(wrapper.text()).toContain(texts.missedQuestion)
    expect(wrapper.find('[data-test="feedback-dictation"]').text()).toContain(
      'You missed the article.',
    )
  })
})
