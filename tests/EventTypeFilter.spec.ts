import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import EventTypeFilter from '../src/components/calendar/EventTypeFilter.vue'
import { allEventTypes, type EventTypeValue } from '../src/lib/eventTypes'

describe('EventTypeFilter', () => {
  it('Only deja solo ese tipo', async () => {
    const wrapper = mount(EventTypeFilter, {
      props: {
        modelValue: allEventTypes(),
        'onUpdate:modelValue': (value: Set<EventTypeValue>) =>
          wrapper.setProps({ modelValue: value }),
      },
    })
    await wrapper.find('button').trigger('click')

    await wrapper.find('[data-test="only-TRAVEL"]').trigger('click')

    expect([...wrapper.props('modelValue')]).toEqual(['TRAVEL'])
    expect(wrapper.find('[data-test="only-TRAVEL"]').exists()).toBe(false)
  })
})
