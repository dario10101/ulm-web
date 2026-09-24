import { describe, expect, it } from 'vitest'

import {
  buildDateTime,
  clockFromDate,
  clockFromMinutes,
  formatLocalDateTime,
  minutesOfDay,
  nextDateForWeekday,
  parseLocalDateTime,
} from '../src/lib/time'

describe('formatLocalDateTime', () => {
  it('emite la hora de pared sin zona, no UTC', () => {
    // 11:30 PM: con toISOString() esto se convertiria a otro dia segun la
    // zona del navegador. Aca tienen que salir los digitos tal cual.
    const date = new Date(2026, 8, 15, 23, 30, 0)
    expect(formatLocalDateTime(date)).toBe('2026-09-15T23:30:00')
  })

  it('rellena con ceros horas y minutos de un digito', () => {
    expect(formatLocalDateTime(new Date(2026, 0, 5, 9, 5, 0))).toBe('2026-01-05T09:05:00')
  })

  it('hace ida y vuelta sin perder la hora de pared', () => {
    const original = new Date(2026, 11, 31, 0, 30, 0)
    const roundTripped = parseLocalDateTime(formatLocalDateTime(original))
    expect(roundTripped.getFullYear()).toBe(2026)
    expect(roundTripped.getMonth()).toBe(11)
    expect(roundTripped.getDate()).toBe(31)
    expect(roundTripped.getHours()).toBe(0)
    expect(roundTripped.getMinutes()).toBe(30)
  })
})

describe('reloj de 12 horas', () => {
  it('clockFromDate lee la hora de un Date', () => {
    expect(clockFromDate(new Date(2026, 8, 15, 0, 5))).toEqual({ hour: 12, minute: 5, ampm: 'AM' })
    expect(clockFromDate(new Date(2026, 8, 15, 12, 0))).toEqual({ hour: 12, minute: 0, ampm: 'PM' })
    expect(clockFromDate(new Date(2026, 8, 15, 21, 30))).toEqual({
      hour: 9,
      minute: 30,
      ampm: 'PM',
    })
  })

  it('clockFromMinutes y minutesOfDay son inversas', () => {
    for (const total of [0, 5, 719, 720, 1439]) {
      const { hour, minute, ampm } = clockFromMinutes(total)
      expect(minutesOfDay(hour, minute, ampm)).toBe(total)
    }
  })

  it('clockFromMinutes normaliza un total que se pasa del dia', () => {
    // 23:30 + 60 min: se usa al prellenar la hora final desde la de inicio.
    expect(clockFromMinutes(23 * 60 + 30 + 60)).toEqual({ hour: 12, minute: 30, ampm: 'AM' })
  })
})

describe('buildDateTime y nextDateForWeekday', () => {
  it('buildDateTime pega la hora sobre la fecha, sin tocar el dia', () => {
    const result = buildDateTime(new Date(2026, 8, 15), 9, 30, 'PM')
    expect(result.getDate()).toBe(15)
    expect(result.getHours()).toBe(21)
    expect(result.getMinutes()).toBe(30)
  })

  it('nextDateForWeekday devuelve el mismo dia si ya coincide', () => {
    const tuesday = new Date(2026, 8, 15) // martes
    expect(nextDateForWeekday(2, tuesday).getDate()).toBe(15)
  })

  it('nextDateForWeekday avanza al proximo dia que coincide', () => {
    const tuesday = new Date(2026, 8, 15)
    expect(nextDateForWeekday(5, tuesday).getDate()).toBe(18) // viernes
    expect(nextDateForWeekday(1, tuesday).getDate()).toBe(21) // lunes siguiente
  })
})
