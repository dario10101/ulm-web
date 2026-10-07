/** Lee el valor de un input/textarea tras un evento "input", en mayusculas. */
export function uppercaseInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value.toUpperCase()
}
