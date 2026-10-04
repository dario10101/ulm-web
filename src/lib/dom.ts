/**
 * Scrollea `container` hasta dejar `target` en su borde superior.
 *
 * No se usa `offsetTop` porque depende del `offsetParent`, que no tiene por que
 * ser el contenedor con scroll: se mide la posicion relativa real entre ambos.
 *
 * @param topInset alto de lo que queda pegado arriba dentro del contenedor
 *   (encabezados `sticky`): sin descontarlo, el target quedaria tapado.
 */
export function scrollElementIntoContainer(
  container: HTMLElement | null,
  target: HTMLElement | null,
  topInset = 0,
): void {
  if (!container || !target) return
  const offset =
    target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
  container.scrollTop = offset - topInset
}

/**
 * Cuanto ocupa, desde el borde superior de `container`, un elemento `sticky`
 * pegado arriba (hasta su borde inferior). 0 si no esta visible.
 */
export function stickyInset(container: HTMLElement | null, sticky: HTMLElement | null): number {
  if (!container || !sticky?.offsetParent) return 0
  return Math.max(0, sticky.getBoundingClientRect().bottom - container.getBoundingClientRect().top)
}
