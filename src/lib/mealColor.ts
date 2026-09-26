/**
 * Escala de color para "cuanto se comio en un dia", en unidades de porcion
 * completa (100 = un plato entero, ver `meal_size`). Se toma como referencia
 * ~3 comidas completas por dia (300) como el punto optimo: por debajo se lee
 * como poco, por encima como exceso. Es una heuristica de diseno, no una
 * recomendacion nutricional real; los cortes son ajustables aca si hace falta
 * calibrarlos mas adelante.
 */

type Rgb = [number, number, number]

interface ColorStop {
  at: number
  color: Rgb
}

const STOPS: ColorStop[] = [
  { at: 0, color: [191, 219, 254] }, // azul claro: nada registrado
  { at: 150, color: [187, 247, 208] }, // verde claro: va arrancando (el azul se funde en verde)
  { at: 300, color: [22, 163, 74] }, // verde intenso: punto optimo
  { at: 450, color: [245, 158, 11] }, // naranja: por encima de lo optimo
  { at: 650, color: [220, 38, 38] }, // rojo: exceso
]

export const MEAL_SCALE_MAX = STOPS[STOPS.length - 1].at

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** Color solido correspondiente a un total del dia (clamps por debajo de 0 y por encima del ultimo stop). */
export function mealIntensityColor(totalPortion: number): string {
  const value = Math.max(0, totalPortion)
  for (let i = 0; i < STOPS.length - 1; i++) {
    const from = STOPS[i]
    const to = STOPS[i + 1]
    if (value <= to.at) {
      const t = (value - from.at) / (to.at - from.at)
      return rgbToHex([
        lerp(from.color[0], to.color[0], t),
        lerp(from.color[1], to.color[1], t),
        lerp(from.color[2], to.color[2], t),
      ])
    }
  }
  return rgbToHex(STOPS[STOPS.length - 1].color)
}

/**
 * CSS de un gradiente que recorre toda la escala (0 a MEAL_SCALE_MAX). La
 * barra se pinta como una barra de progreso: este gradiente se ancla al
 * ancho total de la barra (no al del relleno) y se recorta con
 * `mealScalePositionPercent`, para que el color de cada punto no cambie
 * segun cuanto se haya comido ese dia.
 */
export const mealScaleGradientCss = STOPS.map(
  (stop) => `${rgbToHex(stop.color)} ${Math.round((stop.at / MEAL_SCALE_MAX) * 100)}%`,
).join(', ')

/** Cuanto (0-100) de la barra rellenar para un total dado; el resto queda vacio. */
export function mealScalePositionPercent(totalPortion: number): number {
  return Math.min(100, Math.max(0, (totalPortion / MEAL_SCALE_MAX) * 100))
}
