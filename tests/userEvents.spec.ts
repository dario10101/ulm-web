import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import EventCodePicker from '../src/components/calendar/EventCodePicker.vue'
import {
  eventDateLabel,
  filterEventCodes,
  normalizeEventCode,
  sortEventsForDisplay,
  validateEventForm,
  weekEventBars,
  type EventFormFields,
} from '../src/lib/userEvents'
import type { CalendarEventRange } from '../src/types/calendarEvent'

function range(overrides: Partial<CalendarEventRange> = {}): CalendarEventRange {
  return {
    id: 1,
    name: 'Viaje',
    detail: null,
    code: 'TRAVEL',
    source: 'user_event',
    first_day: '2026-10-05',
    last_day: '2026-10-05',
    category_id: 3,
    ...overrides,
  }
}

const WEEK = [
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
  '2026-10-08',
  '2026-10-09',
  '2026-10-10',
  '2026-10-11',
]

describe('tipo del evento', () => {
  it('normaliza a mayusculas y sin espacios sobrantes, igual que el backend', () => {
    expect(normalizeEventCode('  day   off ')).toBe('DAY OFF')
    expect(normalizeEventCode('')).toBe('')
  })

  it('con el campo vacio muestra todos los tipos', () => {
    expect(filterEventCodes(['BIRTHDAY', 'TRAVEL'], '')).toEqual(['BIRTHDAY', 'TRAVEL'])
  })

  it('reduce las opciones a las que contienen lo escrito, sin importar mayusculas', () => {
    const codes = ['BIRTHDAY', 'BUSINESS TRIP', 'TRAVEL', 'TRIP']
    expect(filterEventCodes(codes, 'trip')).toEqual(['BUSINESS TRIP', 'TRIP'])
    expect(filterEventCodes(codes, 'xyz')).toEqual([])
  })
})

describe('validateEventForm', () => {
  const valid: EventFormFields = {
    name: '  Playa ',
    code: 'vacation',
    categoryId: 3,
    firstDay: '2026-10-05',
    lastDay: '2026-10-08',
    detail: '  ',
  }

  it('arma el payload con el tipo en mayusculas y el detalle vacio como null', () => {
    expect(validateEventForm(valid)).toEqual({
      ok: true,
      payload: {
        name: 'Playa',
        code: 'VACATION',
        category_id: 3,
        first_day: '2026-10-05',
        last_day: '2026-10-08',
        detail: null,
      },
    })
  })

  it.each<[string, Partial<EventFormFields>]>([
    ['sin nombre', { name: '   ' }],
    ['sin tipo', { code: '  ' }],
    ['sin categoria', { categoryId: null }],
    ['con el fin antes del inicio', { lastDay: '2026-10-04' }],
  ])('rechaza un evento %s', (_, overrides) => {
    expect(validateEventForm({ ...valid, ...overrides }).ok).toBe(false)
  })
})

describe('presentacion', () => {
  it('muestra un dia solo o el rango completo', () => {
    expect(eventDateLabel(range())).toBe('Oct 5')
    expect(eventDateLabel(range({ last_day: '2026-10-12' }))).toBe('Oct 5 – Oct 12')
  })

  it('pone los festivos primero y despues ordena por fecha', () => {
    const sorted = sortEventsForDisplay([
      range({ id: 1, name: 'Tarde', first_day: '2026-10-07' }),
      range({ id: 2, name: 'Temprano', first_day: '2026-10-05' }),
      range({ id: 3, name: 'Festivo', code: 'HOLIDAY', source: 'event', first_day: '2026-10-09' }),
    ])
    expect(sorted.map((r) => r.name)).toEqual(['Festivo', 'Temprano', 'Tarde'])
  })
})

describe('weekEventBars', () => {
  it('un evento de varios dias es una sola barra que cruza sus columnas', () => {
    const [bar] = weekEventBars([range({ first_day: '2026-10-06', last_day: '2026-10-08' })], WEEK)
    expect(bar).toMatchObject({
      startColumn: 1,
      endColumn: 3,
      continuesBefore: false,
      continuesAfter: false,
    })
  })

  it('recorta a la semana y marca que el evento sigue antes y despues', () => {
    const [bar] = weekEventBars([range({ first_day: '2026-10-01', last_day: '2026-10-20' })], WEEK)
    expect(bar).toMatchObject({
      startColumn: 0,
      endColumn: 6,
      continuesBefore: true,
      continuesAfter: true,
    })
  })

  it('descarta los eventos que no tocan la semana', () => {
    expect(
      weekEventBars([range({ first_day: '2026-10-12', last_day: '2026-10-13' })], WEEK),
    ).toEqual([])
  })
})

describe('EventCodePicker', () => {
  function mountPicker(modelValue = '') {
    return mount(EventCodePicker, {
      props: {
        modelValue,
        codes: ['BIRTHDAY', 'BUSINESS TRIP', 'TRAVEL'],
        loading: false,
        'onUpdate:modelValue': () => {},
      },
    })
  }

  function optionLabels(wrapper: ReturnType<typeof mountPicker>): string[] {
    return wrapper.findAll('[role="option"]').map((o) => o.text())
  }

  it('convierte a mayusculas mientras se escribe', async () => {
    const wrapper = mountPicker()
    await wrapper.find('input').setValue('travel')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['TRAVEL'])
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('TRAVEL')
  })

  it('reduce la lista a medida que se escribe', async () => {
    const wrapper = mountPicker()
    expect(optionLabels(wrapper)).toEqual(['BIRTHDAY', 'BUSINESS TRIP', 'TRAVEL'])

    await wrapper.setProps({ modelValue: 'B' })
    expect(optionLabels(wrapper)).toEqual(['BIRTHDAY', 'BUSINESS TRIP'])

    await wrapper.setProps({ modelValue: 'TRI' })
    expect(optionLabels(wrapper)).toEqual(['BUSINESS TRIP'])
  })

  it('elegir una opcion la pone como tipo', async () => {
    const wrapper = mountPicker('TRA')
    await wrapper.find('[role="option"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['TRAVEL'])
  })

  it('avisa cuando lo escrito es un tipo nuevo, y no cuando ya existe', async () => {
    const wrapper = mountPicker('CONCERT')
    expect(wrapper.text()).toContain('New type CONCERT will be created')

    await wrapper.setProps({ modelValue: 'TRAVEL' })
    expect(wrapper.text()).not.toContain('will be created')
  })
})
