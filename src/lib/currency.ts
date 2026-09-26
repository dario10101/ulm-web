/**
 * Formato de miles para montos en COP (sin decimales): "10345456" ->
 * "10.345.456". Usado tanto por el input de "Add expense" (formatea a medida
 * que se escribe) como por "View records" (formatea el monto ya guardado).
 */
export function formatThousands(digitsOnly: string): string {
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Limpia un input de texto a solo digitos y le aplica formatThousands. */
export function formatThousandsInput(rawInput: string): string {
  const digitsOnly = rawInput.replace(/\D/g, '')
  return digitsOnly ? formatThousands(digitsOnly) : ''
}

/** Inversa de formatThousandsInput: quita los puntos y devuelve el numero. */
export function parseThousandsInput(formatted: string): number {
  return formatted ? Number(formatted.replace(/\./g, '')) : NaN
}

/** Formatea un monto numerico ya guardado (ej. 25000 -> "$ 25.000"). */
export function formatCOP(amount: number): string {
  return `$ ${formatThousands(String(Math.round(amount)))}`
}
