import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import BaseButton from '../src/components/ui/BaseButton.vue'

describe('BaseButton', () => {
  it('con ai-cost avisa que gasta tokens de IA', () => {
    const wrapper = mount(BaseButton, { props: { aiCost: true }, slots: { default: 'Ask' } })

    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.attributes('title')).toBe('Uses AI tokens')
    expect(wrapper.text()).toContain('uses AI tokens')
  })

  it('la ola es blanca sobre fondo de color y de acento sobre fondo claro', () => {
    const primary = mount(BaseButton, { props: { aiCost: true } })
    const secondary = mount(BaseButton, { props: { aiCost: true, variant: 'secondary' } })

    expect(primary.classes()).toEqual(expect.arrayContaining(['ai-shimmer', 'ai-shimmer-on-fill']))
    expect(secondary.classes()).toContain('ai-shimmer')
    expect(secondary.classes()).not.toContain('ai-shimmer-on-fill')
  })

  it('sin ai-cost no lleva la marca', () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Save' } })

    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.attributes('title')).toBeUndefined()
    expect(wrapper.classes()).not.toContain('ai-shimmer')
  })
})
