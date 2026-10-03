/**
 * Interes ganado en el mes por un producto de inversion/ahorro:
 * lo que crecio el saldo descontando el dinero que movio el usuario.
 * interes = saldo final - saldo inicial - aportes + retiros
 * Puede ser negativo (ej. un mes malo en un fondo de inversion).
 */
export function computeMonthlyInterest(input: {
  startBalance: number
  endBalance: number
  deposits: number
  withdrawals: number
}): number {
  return input.endBalance - input.startBalance - input.deposits + input.withdrawals
}
