/**
 * Formato de miles para la parte entera de un monto en COP: "10345456" ->
 * "10.345.456". Usado tanto por el input de "Add expense" (formatea a medida
 * que se escribe) como por "View records" (formatea el monto ya guardado).
 */
export function formatThousands(digitsOnly: string): string {
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Formatea un input de monto a medida que se escribe, convencion colombiana:
 * "." separa miles y "," separa decimales (max. 2). Ej. "1234567,5" -> "1.234.567,5".
 * Un "." tecleado al final se toma como coma decimal: el formato nunca deja un
 * punto al final, asi que si aparece ahi lo escribio el usuario (teclados
 * moviles en ingles solo ofrecen ".").
 */
export function formatAmountInput(rawInput: string, allowNegative = false): string {
  const negative = allowNegative && rawInput.trimStart().startsWith('-')
  const text = rawInput.replace(/\.$/, ',')
  const commaIndex = text.indexOf(',')
  const integerRaw = commaIndex >= 0 ? text.slice(0, commaIndex) : text
  // Sin ceros a la izquierda: con el "0" por defecto, teclear 5 da "5", no "05".
  const integerDigits = integerRaw.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  const sign = negative ? '-' : ''

  if (commaIndex < 0) return integerDigits ? sign + formatThousands(integerDigits) : sign
  const decimals = text
    .slice(commaIndex + 1)
    .replace(/\D/g, '')
    .slice(0, 2)
  return `${sign}${formatThousands(integerDigits || '0')},${decimals}`
}

/** Inversa de formatAmountInput: "1.234.567,5" -> 1234567.5. NaN si esta vacio. */
export function parseAmountInput(formatted: string): number {
  const normalized = formatted.replace(/\./g, '').replace(',', '.')
  return normalized === '' || normalized === '-' ? NaN : Number(normalized)
}

/** Numero -> texto para un input de monto (ej. -12500.5 -> "-12.500,50"). */
export function toAmountInput(amount: number): string {
  const [integer, decimals] = Math.abs(amount).toFixed(2).split('.')
  const sign = amount < 0 ? '-' : ''
  return `${sign}${formatThousands(integer)}${decimals === '00' ? '' : `,${decimals}`}`
}

/** Formatea un monto ya guardado: 25000 -> "$ 25.000", 25000.5 -> "$ 25.000,50". */
export function formatCOP(amount: number): string {
  return `$ ${toAmountInput(amount)}`
}

/** Version corta para ejes y etiquetas de grafico: 25000 -> "$25k", 1250000 -> "$1.3M". */
export function formatCompactCOP(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${trimZero((abs / 1_000_000).toFixed(1))}M`
  if (abs >= 1_000) return `${sign}$${trimZero((abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1))}k`
  return `${sign}$${Math.round(abs)}`
}

function trimZero(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value
}
