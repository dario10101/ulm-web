import { describe, expect, it } from 'vitest'

import {
  computeCellVisuals,
  computeMonthGridDays,
  eventColor,
  firstOfMonth,
  lastOfMonth,
  mondayOf,
  rangesCovering,
} from '../src/lib/monthGrid'
import type { CalendarEventRange } from '../src/types/calendarEvent'

function range(
  id: number,
  firstDay: string,
  lastDay: string,
  code: string | null = null,
): CalendarEventRange {
  return {
    id,
    name: `Evento ${id}`,
    detail: null,
    code,
    source: 'event',
    first_day: firstDay,
    last_day: lastDay,
  }
}

describe('limites de mes y semana', () => {
  it('mondayOf devuelve el lunes de esa semana', () => {
    expect(mondayOf('2026-09-16')).toBe('2026-09-14') // miercoles -> lunes
    expect(mondayOf('2026-09-14')).toBe('2026-09-14') // ya es lunes
    expect(mondayOf('2026-09-20')).toBe('2026-09-14') // domingo -> lunes anterior
  })

  it('firstOfMonth y lastOfMonth respetan meses de distinto largo', () => {
    expect(firstOfMonth('2026-09-16')).toBe('2026-09-01')
    expect(lastOfMonth('2026-09-16')).toBe('2026-09-30')
    expect(lastOfMonth('2026-02-10')).toBe('2026-02-28')
    expect(lastOfMonth('2028-02-10')).toBe('2028-02-29') // bisiesto
  })
})

describe('computeMonthGridDays', () => {
  it('arma semanas completas de 7 dias', () => {
    const days = computeMonthGridDays('2026-09-01')
    expect(days.length % 7).toBe(0)
  })

  it('empieza en lunes y termina en domingo', () => {
    const days = computeMonthGridDays('2026-09-01')
    expect(mondayOf(days[0].isoDate)).toBe(days[0].isoDate)
    expect(days[days.length - 1].isoDate).toBe('2026-10-04')
  })

  it('marca como fuera de mes los dias de relleno', () => {
    const days = computeMonthGridDays('2026-09-01')
    expect(days[0].inMonth).toBe(false) // 31 de agosto
    expect(days.filter((d) => d.inMonth)).toHaveLength(30)
  })

  it('un mes que arranca lunes no necesita relleno al inicio', () => {
    const days = computeMonthGridDays('2026-06-01') // lunes
    expect(days[0].isoDate).toBe('2026-06-01')
    expect(days[0].inMonth).toBe(true)
  })
})

describe('colores de eventos', () => {
  it('un festivo siempre toma el naranja reservado', () => {
    expect(eventColor(range(1, '2026-09-15', '2026-09-15', 'HOLIDAY'))).toBe('#f97316')
    expect(eventColor(range(999, '2026-09-15', '2026-09-15', 'HOLIDAY'))).toBe('#f97316')
  })

  it('un evento normal mantiene su color sin importar el contexto', () => {
    const evento = range(7, '2026-09-10', '2026-09-20', 'TRAVEL')
    expect(eventColor(evento)).toBe(eventColor(evento))
    expect(eventColor(evento)).not.toBe('#f97316')
  })

  it('el festivo manda como fondo aunque no sea el primero de la lista', () => {
    const visuals = computeCellVisuals([
      range(2, '2026-09-15', '2026-09-15', 'TRAVEL'),
      range(3, '2026-09-15', '2026-09-15', 'HOLIDAY'),
    ])
    expect(visuals.tintColor).toBe('#f97316')
    expect(visuals.stripeColors).toHaveLength(1)
  })

  it('un dia sin eventos no pinta nada', () => {
    expect(computeCellVisuals([])).toEqual({ tintColor: '', stripeColors: [] })
  })

  it('descarta los eventos que exceden la paleta', () => {
    const muchos = [1, 2, 3, 4, 5, 6, 7].map((i) => range(i, '2026-09-15', '2026-09-15'))
    expect(computeCellVisuals(muchos).stripeColors.length).toBeLessThanOrEqual(4)
  })
})

describe('rangesCovering', () => {
  it('incluye los dias intermedios y los extremos, y excluye el resto', () => {
    const rangos = [range(1, '2026-09-10', '2026-09-12')]
    expect(rangesCovering(rangos, '2026-09-10')).toHaveLength(1)
    expect(rangesCovering(rangos, '2026-09-11')).toHaveLength(1)
    expect(rangesCovering(rangos, '2026-09-12')).toHaveLength(1)
    expect(rangesCovering(rangos, '2026-09-13')).toHaveLength(0)
  })
})
