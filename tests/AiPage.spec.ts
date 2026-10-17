import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { askAi, getAiModels } from '@/services/aiApi'
import type { AiModels } from '@/types/ai'

import AiPage from '../src/views/admin/AiPage.vue'

vi.mock('@/services/aiApi', () => ({ askAi: vi.fn(), getAiModels: vi.fn() }))

const MODELS: AiModels = {
  models: [
    {
      id: 'cheap',
      label: 'Cheap',
      description: 'Fast.',
      input_usd_per_1m: 0.1,
      output_usd_per_1m: 0.5,
    },
    {
      id: 'smart',
      label: 'Smart',
      description: 'Capable.',
      input_usd_per_1m: 10,
      output_usd_per_1m: 50,
    },
  ],
  default: 'cheap',
}

async function mountPage() {
  const wrapper = mount(AiPage)
  await flushPromises()
  return wrapper
}

describe('AiPage', () => {
  beforeEach(() => {
    vi.mocked(askAi).mockReset()
    vi.mocked(getAiModels).mockReset().mockResolvedValue(structuredClone(MODELS))
  })

  it('preselects the default model and shows its price', async () => {
    const wrapper = await mountPage()

    const select = wrapper.find<HTMLSelectElement>('select')
    expect(select.element.value).toBe('cheap')
    expect(select.findAll('option').map((option) => option.text())).toEqual(['Cheap', 'Smart'])
    expect(wrapper.find('[data-testid="ai-model-info"]').text()).toContain('$0.1 / $0.5')
  })

  it('does not send an empty question', async () => {
    const wrapper = await mountPage()
    await wrapper.find('textarea').setValue('   ')

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.find('form').trigger('submit')
    expect(askAi).not.toHaveBeenCalled()
  })

  it('sends the trimmed question with the chosen model and shows the answer', async () => {
    vi.mocked(askAi).mockResolvedValue({ answer: 'Hola!', model: 'smart' })
    const wrapper = await mountPage()

    await wrapper.find('select').setValue('smart')
    await wrapper.find('textarea').setValue('  hola  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(askAi).toHaveBeenCalledWith('hola', 'smart')
    expect(wrapper.find('[data-testid="ai-answer"]').text()).toBe('Hola!')
    expect(wrapper.text()).toContain('Model: smart')
  })

  it('shows the API error message', async () => {
    vi.mocked(askAi).mockRejectedValue(new Error('La IA no esta configurada en el servidor'))
    const wrapper = await mountPage()

    await wrapper.find('textarea').setValue('hola')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe('La IA no esta configurada en el servidor')
    expect(wrapper.find('[data-testid="ai-answer"]').exists()).toBe(false)
  })

  it('still lets you ask with the server default if the models fail to load', async () => {
    vi.mocked(getAiModels).mockRejectedValue(new Error('No se pudo cargar'))
    vi.mocked(askAi).mockResolvedValue({ answer: 'ok', model: 'cheap' })
    const wrapper = await mountPage()

    expect(wrapper.find('[role="alert"]').text()).toBe('No se pudo cargar')
    await wrapper.find('textarea').setValue('hola')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(askAi).toHaveBeenCalledWith('hola', undefined)
  })
})
