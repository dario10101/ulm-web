/**
 * Scrollea `container` hasta dejar `target` en su borde superior.
 *
 * No se usa `offsetTop` porque depende del `offsetParent`, que no tiene por que
 * ser el contenedor con scroll: se mide la posicion relativa real entre ambos.
 */
export function scrollElementIntoContainer(
  container: HTMLElement | null,
  target: HTMLElement | null,
): void {
  if (!container || !target) return
  const offset =
    target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
  container.scrollTop = offset
}
