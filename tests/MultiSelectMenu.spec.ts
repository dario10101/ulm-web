import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import MultiSelectMenu, {
  type MultiSelectOption,
} from '../src/components/finance/MultiSelectMenu.vue'

const OPTIONS: MultiSelectOption[] = [
  { id: 1, label: 'Food' },
  { id: 2, label: 'Rent' },
  { id: 3, label: 'Fun' },
]

function mountMenu(selected: number[], options = OPTIONS) {
  const wrapper = mount(MultiSelectMenu, {
    props: {
      options,
      allLabel: 'All categories',
      noun: 'categories',
      modelValue: selected,
      'onUpdate:modelValue': (value: number[]) => wrapper.setProps({ modelValue: value }),
    },
  })
  return wrapper
}

const model = (wrapper: ReturnType<typeof mountMenu>) => wrapper.props('modelValue')
const pressed = (wrapper: ReturnType<typeof mountMenu>, test: string) =>
  wrapper.find(`[data-test="${test}"]`).attributes('aria-pressed')

describe('MultiSelectMenu', () => {
  it('sin filtro muestra todo marcado, incluido All', () => {
    const wrapper = mountMenu([])

    expect(wrapper.find('summary').text()).toBe('All categories')
    expect(pressed(wrapper, 'option-all')).toBe('true')
    for (const option of OPTIONS) expect(pressed(wrapper, `option-${option.id}`)).toBe('true')
  })

  it('desde sin filtro, desmarcar una deja todas las demas', async () => {
    const wrapper = mountMenu([])

    await wrapper.find('[data-test="option-2"]').trigger('click')

    expect(model(wrapper)).toEqual([1, 3])
    expect(pressed(wrapper, 'option-all')).toBe('false')
    expect(pressed(wrapper, 'option-2')).toBe('false')
  })

  it('Only deja solo esa opcion', async () => {
    const wrapper = mountMenu([])

    await wrapper.find('[data-test="only-3"]').trigger('click')

    expect(model(wrapper)).toEqual([3])
    expect(wrapper.find('summary').text()).toBe('Fun')
  })

  it('marcar a mano la que faltaba vuelve a sin filtro', async () => {
    const wrapper = mountMenu([1, 3])

    await wrapper.find('[data-test="option-2"]').trigger('click')

    expect(model(wrapper)).toEqual([])
  })

  it('All vuelve a sin filtro', async () => {
    const wrapper = mountMenu([2])

    await wrapper.find('[data-test="option-all"]').trigger('click')

    expect(model(wrapper)).toEqual([])
  })

  it('no deja desmarcar la ultima opcion marcada', async () => {
    const wrapper = mountMenu([2])

    await wrapper.find('[data-test="option-2"]').trigger('click')

    expect(model(wrapper)).toEqual([2])
    expect(wrapper.find('[data-test="only-2"]').exists()).toBe(false)
  })

  it('con una sola opcion no hay Only ni se puede desmarcar', async () => {
    const wrapper = mountMenu([], [OPTIONS[0]])

    await wrapper.find('[data-test="option-1"]').trigger('click')

    expect(model(wrapper)).toEqual([])
    expect(wrapper.find('[data-test="only-1"]').exists()).toBe(false)
  })
})
