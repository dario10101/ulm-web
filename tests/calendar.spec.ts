import { describe, expect, it } from 'vitest'

import { buildMonthGrid } from '../src/lib/calendar'

describe('buildMonthGrid', () => {
  it('rellena con null los dias antes del 1 y completa la ultima semana', () => {
    // Febrero 2026 empieza en domingo (weekday 0) y tiene 28 dias -> 4 semanas exactas, sin padding.
    const grid = buildMonthGrid(new Date(2026, 1, 15))

    expect(grid.length % 7).toBe(0)
    expect(grid[0]).toBe(1)
    expect(grid.filter((cell) => cell !== null)).toHaveLength(28)
  })

  it('agrega padding inicial cuando el mes no empieza en domingo', () => {
    // Marzo 2026 empieza en domingo tambien; usamos abril 2026 (empieza miercoles, weekday 3).
    const grid = buildMonthGrid(new Date(2026, 3, 10))

    expect(grid.slice(0, 3)).toEqual([null, null, null])
    expect(grid[3]).toBe(1)
  })
})
