import { describe, expect, it } from 'vitest'

import {
  computeTimelineBlocks,
  HOUR_ROW_HEIGHT,
  hourLabel,
  minutesFromTimelineStart,
  timeRangeLabel,
} from '../src/lib/timeline'
import type { CalendarTaskOccurrence } from '../src/types/calendarTask'

/** Ocurrencia minima: solo lo que la linea de tiempo mira. */
function at(localTime: string, durationMinutes: number, id = 1): CalendarTaskOccurrence {
  return {
    id,
    name: `Tarea ${id}`,
    importance: 'STANDARD',
    category_id: 1,
    notify: false,
    repeat_mode: null,
    scheduled_date: `2026-09-15T${localTime}:00`,
    repeat_date: null,
    duration_minutes: durationMinutes,
    add_to_checklist: false,
    detail: null,
    occurrence_at: `2026-09-15T${localTime}:00Z`,
    occurrence_local: `2026-09-15T${localTime}:00`,
  }
}

describe('minutesFromTimelineStart', () => {
  it('cuenta desde las 5am, que es donde arranca la grilla', () => {
    expect(minutesFromTimelineStart(new Date(2026, 8, 15, 5, 0))).toBe(0)
    expect(minutesFromTimelineStart(new Date(2026, 8, 15, 9, 30))).toBe(270)
  })

  it('trata la medianoche como el final del dia, no como el principio', () => {
    // La franja 12am-1am es la ultima de la grilla (19 horas despues de las 5am).
    expect(minutesFromTimelineStart(new Date(2026, 8, 15, 0, 0))).toBe(19 * 60)
  })
})

describe('computeTimelineBlocks', () => {
  it('posiciona una tarea segun su hora de inicio y su duracion', () => {
    const [block] = computeTimelineBlocks([at('09:00', 60)])
    expect(block.top).toBe(4 * HOUR_ROW_HEIGHT) // 9am = 4 horas despues de las 5am
    expect(block.height).toBe(HOUR_ROW_HEIGHT)
    expect(block.widthPercent).toBe(100)
  })

  it('deja a ancho completo dos tareas que no se solapan', () => {
    const blocks = computeTimelineBlocks([at('09:00', 60, 1), at('11:00', 60, 2)])
    expect(blocks).toHaveLength(2)
    expect(blocks.every((b) => b.widthPercent === 100)).toBe(true)
  })

  it('reparte en carriles dos tareas que se solapan', () => {
    const blocks = computeTimelineBlocks([at('09:00', 60, 1), at('09:30', 60, 2)])
    expect(blocks).toHaveLength(2)
    expect(blocks.every((b) => b.widthPercent === 50)).toBe(true)
    expect(new Set(blocks.map((b) => b.leftPercent))).toEqual(new Set([0, 50]))
  })

  it('reparte en tres carriles tres tareas simultaneas', () => {
    const blocks = computeTimelineBlocks([
      at('09:00', 60, 1),
      at('09:15', 60, 2),
      at('09:30', 60, 3),
    ])
    expect(blocks).toHaveLength(3)
    expect(blocks.every((b) => Math.round(b.widthPercent) === 33)).toBe(true)
  })

  it('reutiliza el carril que quedo libre en vez de abrir uno nuevo', () => {
    // 1 y 2 se solapan (2 carriles). 3 empieza cuando 1 ya termino, asi que
    // cabe en el carril de 1: el cluster no debe crecer a 3 carriles.
    const blocks = computeTimelineBlocks([
      at('09:00', 60, 1),
      at('09:30', 90, 2),
      at('10:00', 30, 3),
    ])
    expect(blocks.every((b) => b.widthPercent === 50)).toBe(true)
  })

  it('da un alto minimo a una tarea muy corta para que siga siendo clickeable', () => {
    const [block] = computeTimelineBlocks([at('09:00', 5)])
    expect(block.height).toBeGreaterThanOrEqual(24)
  })

  it('recorta la tarea que se pasa del final de la grilla', () => {
    // 11:30 PM + 90 min terminaria a la 1am, fuera de la grilla.
    const [block] = computeTimelineBlocks([at('23:30', 90)])
    expect(block.top + block.height).toBeLessThanOrEqual(20 * HOUR_ROW_HEIGHT)
  })

  it('ignora las tareas de las horas sin fila en la grilla (1am-4am)', () => {
    expect(computeTimelineBlocks([at('03:00', 60)])).toHaveLength(0)
  })

  it('no devuelve nada si no hay ocurrencias', () => {
    expect(computeTimelineBlocks([])).toEqual([])
  })
})

describe('etiquetas', () => {
  it('formatea las horas de la grilla en 12 horas', () => {
    expect(hourLabel(5)).toBe('5:00 AM')
    expect(hourLabel(12)).toBe('12:00 PM')
    expect(hourLabel(0)).toBe('12:00 AM')
    expect(hourLabel(23)).toBe('11:00 PM')
  })

  it('arma el rango de inicio a fin sumando la duracion', () => {
    expect(timeRangeLabel(at('09:00', 60))).toBe('9:00 AM – 10:00 AM')
    expect(timeRangeLabel(at('13:45', 30))).toBe('1:45 PM – 2:15 PM')
  })
})
