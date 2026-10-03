import { describe, expect, it } from 'vitest'

import { formatAmountInput, formatCOP, parseAmountInput, toAmountInput } from '../src/lib/currency'
import { daysInMonth, moveToMonth, previousMonth } from '../src/lib/date'
import { computeMonthlyInterest } from '../src/lib/income'

describe('moveToMonth', () => {
  it('conserva el dia si existe en el mes destino', () => {
    expect(moveToMonth('2026-09-27', 2)).toBe('2026-03-27')
  })

  it('baja al ultimo dia si el mes destino es mas corto', () => {
    expect(moveToMonth('2026-01-31', 1)).toBe('2026-02-28')
    expect(moveToMonth('2028-03-30', 1)).toBe('2028-02-29')
    expect(moveToMonth('2026-05-31', 5)).toBe('2026-06-30')
  })
})

describe('daysInMonth / previousMonth', () => {
  it('calcula dias del mes incluyendo bisiestos', () => {
    expect(daysInMonth(2026, 1)).toBe(28)
    expect(daysInMonth(2028, 1)).toBe(29)
  })

  it('enero retrocede a diciembre del anio anterior', () => {
    expect(previousMonth(2026, 0)).toEqual({ year: 2025, monthIndex: 11 })
    expect(previousMonth(2026, 8)).toEqual({ year: 2026, monthIndex: 7 })
  })
})

describe('computeMonthlyInterest', () => {
  it('descuenta aportes y suma retiros', () => {
    expect(
      computeMonthlyInterest({
        startBalance: 3_000_000,
        endBalance: 3_550_000,
        deposits: 500_000,
        withdrawals: 0,
      }),
    ).toBe(50_000)
    expect(
      computeMonthlyInterest({
        startBalance: 3_000_000,
        endBalance: 2_820_000,
        deposits: 0,
        withdrawals: 200_000,
      }),
    ).toBe(20_000)
  })

  it('puede ser negativo', () => {
    expect(
      computeMonthlyInterest({ startBalance: 1_000, endBalance: 900, deposits: 0, withdrawals: 0 }),
    ).toBe(-100)
  })
})

describe('formatAmountInput', () => {
  it('pone puntos de miles y conserva hasta 2 decimales tras la coma', () => {
    expect(formatAmountInput('1234567')).toBe('1.234.567')
    expect(formatAmountInput('1234567,5')).toBe('1.234.567,5')
    expect(formatAmountInput('1.234.567,559')).toBe('1.234.567,55')
    expect(formatAmountInput(',5')).toBe('0,5')
  })

  it('toma un punto tecleado al final como coma decimal', () => {
    expect(formatAmountInput('1.234.')).toBe('1.234,')
  })

  it('descarta letras y ceros a la izquierda', () => {
    expect(formatAmountInput('05')).toBe('5')
    expect(formatAmountInput('12a3')).toBe('123')
    expect(formatAmountInput('')).toBe('')
  })

  it('solo admite signo si se permite', () => {
    expect(formatAmountInput('-2000')).toBe('2.000')
    expect(formatAmountInput('-2000', true)).toBe('-2.000')
    expect(formatAmountInput('-', true)).toBe('-')
  })
})

describe('parseAmountInput / toAmountInput / formatCOP', () => {
  it('ida y vuelta con decimales y signo', () => {
    expect(parseAmountInput('1.234.567,5')).toBe(1234567.5)
    expect(parseAmountInput('-2.000')).toBe(-2000)
    expect(parseAmountInput('1.234,')).toBe(1234)
    expect(parseAmountInput('')).toBeNaN()
    expect(parseAmountInput('-')).toBeNaN()
    expect(toAmountInput(-12500.5)).toBe('-12.500,50')
    expect(toAmountInput(3000000)).toBe('3.000.000')
  })

  it('formatCOP muestra centavos solo si los hay', () => {
    expect(formatCOP(25000)).toBe('$ 25.000')
    expect(formatCOP(25000.5)).toBe('$ 25.000,50')
    expect(formatCOP(-5000)).toBe('$ -5.000')
  })
})
