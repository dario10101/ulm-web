import { describe, expect, it } from 'vitest'

import { defaultWeekRange, isoWeekday, parseDecimal, todayIsoDate } from '../src/lib/date'

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

describe('defaultWeekRange', () => {
  it('si hoy es sabado, arranca hoy mismo', () => {
    const saturday = new Date(2026, 8, 19)
    expect(defaultWeekRange(saturday)).toEqual({ firstDay: '2026-09-19', lastDay: '2026-09-25' })
  })

  it('si hoy no es sabado, retrocede hasta el sabado anterior', () => {
    const wednesday = new Date(2026, 8, 23)
    expect(defaultWeekRange(wednesday)).toEqual({ firstDay: '2026-09-19', lastDay: '2026-09-25' })
  })

  it('si hoy es domingo, el sabado anterior fue ayer', () => {
    const sunday = new Date(2026, 8, 20)
    expect(defaultWeekRange(sunday)).toEqual({ firstDay: '2026-09-19', lastDay: '2026-09-25' })
  })
})
