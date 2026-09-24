import { describe, expect, it } from 'vitest'

import { defaultEndMinutes, validateTaskForm, type TaskFormFields } from '../src/lib/taskForm'

function form(overrides: Partial<TaskFormFields> = {}): TaskFormFields {
  return {
    name: 'Gimnasio',
    categoryId: 3,
    date: '2026-09-15',
    weekday: 2,
    hour: 7,
    minute: 30,
    ampm: 'AM',
    endHour: 8,
    endMinute: 30,
    endAmpm: 'AM',
    ...overrides,
  }
}

describe('validateTaskForm', () => {
  it('acepta un formulario completo y arma la hora de pared', () => {
    const result = validateTaskForm(form(), false)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.name).toBe('Gimnasio')
    expect(result.localDateTime).toBe('2026-09-15T07:30:00')
    expect(result.durationMinutes).toBe(60)
  })

  it('recorta los espacios del nombre', () => {
    const result = validateTaskForm(form({ name: '  Gimnasio  ' }), false)
    expect(result.ok && result.name).toBe('Gimnasio')
  })

  it('exige nombre y categoria', () => {
    expect(validateTaskForm(form({ name: '   ' }), false)).toMatchObject({ ok: false })
    expect(validateTaskForm(form({ categoryId: null }), false)).toMatchObject({ ok: false })
  })

  it('exige fecha solo cuando la tarea no repite semanalmente', () => {
    expect(validateTaskForm(form({ date: '' }), false)).toMatchObject({ ok: false })
    expect(validateTaskForm(form({ date: '' }), true).ok).toBe(true)
  })

  it('rechaza una hora final anterior o igual a la de inicio', () => {
    expect(validateTaskForm(form({ endHour: 7, endMinute: 30 }), false)).toMatchObject({
      ok: false,
    })
    expect(validateTaskForm(form({ endHour: 6 }), false)).toMatchObject({ ok: false })
  })

  it('calcula la duracion cruzando el mediodia', () => {
    const result = validateTaskForm(form({ endHour: 1, endAmpm: 'PM', endMinute: 0 }), false)
    expect(result.ok && result.durationMinutes).toBe(330) // 7:30 AM -> 1:00 PM
  })

  it('en modo semanal ancla al proximo dia de semana elegido, no a la fecha', () => {
    const result = validateTaskForm(form({ date: '', weekday: 5 }), true)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(new Date(result.localDateTime).getDay()).toBe(5) // viernes
  })
})

describe('defaultEndMinutes', () => {
  it('suma una hora al inicio', () => {
    expect(defaultEndMinutes(7 * 60 + 30)).toBe(8 * 60 + 30)
  })

  it('no cruza la medianoche', () => {
    expect(defaultEndMinutes(23 * 60 + 30)).toBe(23 * 60 + 59)
  })
})
