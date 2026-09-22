import { describe, expect, it } from 'vitest'

import { formatLocalDateTime, parseLocalDateTime } from '../src/lib/time'

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
