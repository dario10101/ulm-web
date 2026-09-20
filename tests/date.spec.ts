import { describe, expect, it } from 'vitest'

import {
  addDays,
  formatDateLong,
  formatIsoDate,
  isoWeekday,
  parseDecimal,
  parseIsoDate,
  todayIsoDate,
} from '../src/lib/date'

describe('todayIsoDate', () => {
  it('devuelve la fecha local en formato YYYY-MM-DD', () => {
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`

    expect(todayIsoDate()).toBe(expected)
  })
})

describe('parseDecimal', () => {
  it('acepta coma como separador decimal', () => {
    expect(parseDecimal('72,4')).toBe(72.4)
  })

  it('acepta punto como separador decimal', () => {
    expect(parseDecimal('72.4')).toBe(72.4)
  })

  it('devuelve null para texto vacio o invalido', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('   ')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
  })
})

describe('isoWeekday', () => {
  it('mapea domingo (0) a 7 y deja el resto igual', () => {
    expect(isoWeekday(new Date(2026, 8, 19))).toBe(6) // sabado
    expect(isoWeekday(new Date(2026, 8, 20))).toBe(7) // domingo
    expect(isoWeekday(new Date(2026, 8, 21))).toBe(1) // lunes
  })
})

describe('addDays', () => {
  it('suma dias respetando cambios de mes', () => {
    expect(formatIsoDate(addDays(new Date(2026, 8, 19), 6))).toBe('2026-09-25')
  })

  it('acepta desplazamientos negativos', () => {
    expect(formatIsoDate(addDays(new Date(2026, 8, 19), -1))).toBe('2026-09-18')
  })
})

describe('parseIsoDate', () => {
  it('interpreta el string como fecha local, sin corrimiento por UTC', () => {
    const parsed = parseIsoDate('2026-09-19')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(8)
    expect(parsed.getDate()).toBe(19)
  })
})

describe('formatDateLong', () => {
  it('formatea como "March 21, 2026"', () => {
    expect(formatDateLong(new Date(2026, 2, 21))).toBe('March 21, 2026')
  })

  it('no depende del locale del entorno (nombres fijos)', () => {
    expect(formatDateLong(new Date(2026, 0, 1))).toBe('January 1, 2026')
    expect(formatDateLong(new Date(2026, 11, 31))).toBe('December 31, 2026')
  })
})
