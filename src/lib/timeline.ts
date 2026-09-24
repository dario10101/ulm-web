/**
 * Linea de tiempo continua de las vistas Daily y Weekly del calendario.
 *
 * Logica pura: recibe ocurrencias y devuelve posiciones en px. No toca Vue, ni
 * la red, ni el DOM, asi que se puede probar en aislamiento (ver
 * tests/timeline.spec.ts).
 */

import type { CalendarTaskOccurrence } from '@/types/calendarTask'

/**
 * Franjas horarias de la grilla, de 5am a 1am. El `0` del final es la franja
 * 12am-1am de ese mismo dia calendario; las horas 1am-4am no tienen fila y sus
 * tareas quedan fuera de la linea de tiempo.
 */
export const HOURS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0]

/** Alto de una fila de hora, en px. Es la escala de todo el calculo. */
export const HOUR_ROW_HEIGHT = 64

const TIMELINE_TOTAL_MINUTES = HOURS.length * 60

/** Alto minimo de un bloque, para que una tarea corta siga siendo legible y clickeable. */
const TIMELINE_MIN_BLOCK_HEIGHT = 24

/** Primera hora que se muestra al abrir la vista (las anteriores quedan scrolleando hacia arriba). */
export const DEFAULT_VISIBLE_HOUR = 8

export interface TimelineBlock {
  occurrence: CalendarTaskOccurrence
  top: number
  height: number
  leftPercent: number
  widthPercent: number
}

interface TimelineItem {
  occurrence: CalendarTaskOccurrence
  startMin: number
  endMin: number
}

/** Minutos transcurridos desde el inicio de la grilla (5am). */
export function minutesFromTimelineStart(date: Date): number {
  const hour = date.getHours()
  const effectiveHour = hour < 5 ? hour + 24 : hour
  return (effectiveHour - 5) * 60 + date.getMinutes()
}

export function hourLabel(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:00 ${period}`
}

export function timeLabel(date: Date): string {
  const period = date.getHours() < 12 ? 'AM' : 'PM'
  const hour12 = date.getHours() % 12 === 0 ? 12 : date.getHours() % 12
  return `${hour12}:${String(date.getMinutes()).padStart(2, '0')} ${period}`
}

/** Rango completo, ej. "9:00 AM – 10:00 AM". */
export function timeRangeLabel(occurrence: CalendarTaskOccurrence): string {
  const start = new Date(occurrence.occurrence_local)
  const end = new Date(start.getTime() + occurrence.duration_minutes * 60000)
  return `${timeLabel(start)} – ${timeLabel(end)}`
}

/**
 * Posiciona cada ocurrencia con top/height en px segun su hora de inicio y su
 * duracion real, y reparte en "carriles" las que se solapan para que ninguna
 * quede tapada por otra dentro de la misma columna (categoria en Daily, dia en
 * Weekly).
 *
 * Algoritmo greedy estandar de asignacion de carriles: se agrupan los
 * intervalos en clusters que se cruzan entre si, y dentro de cada cluster cada
 * tarea toma el primer carril que ya quedo libre.
 */
export function computeTimelineBlocks(occurrences: CalendarTaskOccurrence[]): TimelineBlock[] {
  const items: TimelineItem[] = []
  for (const occurrence of occurrences) {
    // occurrence_local, no occurrence_at: hay que ubicarla en la hora de
    // pared del usuario, no en la zona del navegador (ver lib/time.ts).
    const start = new Date(occurrence.occurrence_local)
    if (!HOURS.includes(start.getHours())) continue
    const startMin = minutesFromTimelineStart(start)
    const endMin = Math.min(startMin + occurrence.duration_minutes, TIMELINE_TOTAL_MINUTES)
    items.push({ occurrence, startMin, endMin })
  }
  items.sort((a, b) => a.startMin - b.startMin)

  const blocks: TimelineBlock[] = []
  let cluster: TimelineItem[] = []
  let clusterEnd = -Infinity

  function flushCluster() {
    if (!cluster.length) return
    const laneEnds: number[] = []
    const assignments: { item: TimelineItem; lane: number }[] = []
    for (const item of cluster) {
      let lane = laneEnds.findIndex((end) => end <= item.startMin)
      if (lane === -1) {
        lane = laneEnds.length
        laneEnds.push(item.endMin)
      } else {
        laneEnds[lane] = item.endMin
      }
      assignments.push({ item, lane })
    }
    const laneCount = laneEnds.length
    for (const { item, lane } of assignments) {
      blocks.push({
        occurrence: item.occurrence,
        top: (item.startMin / 60) * HOUR_ROW_HEIGHT,
        height: Math.max(
          TIMELINE_MIN_BLOCK_HEIGHT,
          ((item.endMin - item.startMin) / 60) * HOUR_ROW_HEIGHT,
        ),
        leftPercent: (lane / laneCount) * 100,
        widthPercent: 100 / laneCount,
      })
    }
    cluster = []
    clusterEnd = -Infinity
  }

  for (const item of items) {
    if (cluster.length && item.startMin >= clusterEnd) flushCluster()
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.endMin)
  }
  flushCluster()

  return blocks
}
