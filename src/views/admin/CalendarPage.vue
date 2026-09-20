<script setup lang="ts">
import { Check, ChevronDown, ChevronLeft, ChevronRight, Copy, ExternalLink, Pencil, Plus, Trash2, X } from '@lucide/vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import { addDays, formatDateLong, formatIsoDate, isoWeekday, parseIsoDate, todayIsoDate } from '@/lib/date'
import { ApiError } from '@/lib/http'
import { listCalendarEventRanges, listCalendarEvents } from '@/services/calendarEventsApi'
import {
  createCalendarTask,
  deleteCalendarTask,
  enableCalendarTaskChecklistSync,
  listCalendarTasksForDay,
  listCalendarTasksForRange,
  updateCalendarTask,
} from '@/services/calendarTasksApi'
import { listCategories } from '@/services/checklistsApi'
import type { CalendarEventMarker, CalendarEventRange } from '@/types/calendarEvent'
import type { CalendarTaskOccurrence, RepeatMode } from '@/types/calendarTask'
import type { Category, Importance } from '@/types/checklist'

// --- Selector de vista (Daily/Weekly/Monthly/Yearly). Monthly es la vista
// por defecto (ver viewMode mas abajo). ---

type ViewMode = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
]

const viewMode = ref<ViewMode>('MONTHLY')
const viewMenuOpen = ref(false)

function viewLabel(mode: ViewMode): string {
  return VIEW_OPTIONS.find((option) => option.value === mode)?.label ?? ''
}

function selectView(mode: ViewMode) {
  viewMode.value = mode
  viewMenuOpen.value = false
}

// --- Vista diaria: grilla categorias (columnas) x horas (filas, 5am-12am) ---

const HOURS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0]

function hourLabel(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:00 ${period}`
}

function timeLabel(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  const period = date.getHours() < 12 ? 'AM' : 'PM'
  const hour12 = date.getHours() % 12 === 0 ? 12 : date.getHours() % 12
  return `${hour12}:${String(date.getMinutes()).padStart(2, '0')} ${period}`
}

// Rango completo, ej. "9:00 AM – 10:00 AM". Usado en el panel de Monthly
// (impacto puramente informativo) y en los chips de Daily/Weekly, ahora que
// tienen una duracion real y no solo una hora de inicio.
function timeRangeLabel(occurrence: CalendarTaskOccurrence): string {
  const start = new Date(occurrence.occurrence_at)
  const end = new Date(start.getTime() + occurrence.duration_minutes * 60000)
  return `${timeLabel(start.toISOString())} – ${timeLabel(end.toISOString())}`
}

// --- Linea de tiempo continua (Daily/Weekly, grilla de escritorio): cada
// tarea se posiciona con top/height en px segun su hora de inicio y su
// duracion real, en vez de "todo el bloque de una hora". HOURS cubre de
// 5am a 1am (el "0" al final es la franja 12am-1am de ese mismo dia
// calendario); las horas 1am-4am no tienen fila en la grilla (limitacion ya
// existente antes de esta funcionalidad) y sus tareas se excluyen de la
// linea de tiempo igual que ya se excluian del bucket por hora.
const HOUR_ROW_HEIGHT = 64 // px
const TIMELINE_TOTAL_MINUTES = HOURS.length * 60
const TIMELINE_MIN_BLOCK_HEIGHT = 24 // px, para que una tarea muy corta siga siendo legible/clickeable

function minutesFromTimelineStart(date: Date): number {
  const hour = date.getHours()
  const effectiveHour = hour < 5 ? hour + 24 : hour
  return (effectiveHour - 5) * 60 + date.getMinutes()
}

interface TimelineBlock {
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

// Empaqueta en "carriles" (lanes) las tareas que se solapan en el tiempo,
// para que ninguna quede tapada por otra dentro de la misma columna
// (categoria en Daily, dia en Weekly) — algoritmo greedy estandar de
// asignacion de carriles sobre clusters de intervalos que se cruzan.
function computeTimelineBlocks(occurrences: CalendarTaskOccurrence[]): TimelineBlock[] {
  const items: TimelineItem[] = []
  for (const occurrence of occurrences) {
    const start = new Date(occurrence.occurrence_at)
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
        height: Math.max(TIMELINE_MIN_BLOCK_HEIGHT, ((item.endMin - item.startMin) / 60) * HOUR_ROW_HEIGHT),
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


const currentDate = ref(todayIsoDate())
const categories = ref<Category[]>([])
const occurrences = ref<CalendarTaskOccurrence[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)

// Filtro de categoria: evita depender de mostrar todas las columnas a la vez,
// que es lo que forzaria scroll horizontal en pantallas angostas.
const selectedCategoryId = ref<number | 'ALL'>('ALL')
const visibleCategories = computed(() =>
  selectedCategoryId.value === 'ALL'
    ? categories.value
    : categories.value.filter((c) => c.id === selectedCategoryId.value),
)

function goToPreviousDay() {
  currentDate.value = formatIsoDate(addDays(parseIsoDate(currentDate.value), -1))
}

function goToNextDay() {
  currentDate.value = formatIsoDate(addDays(parseIsoDate(currentDate.value), 1))
}

function goToToday() {
  currentDate.value = todayIsoDate()
  weekStart.value = mondayOf(todayIsoDate())
  monthCursor.value = firstOfMonth(todayIsoDate())
  selectedDay.value = todayIsoDate()
  yearCursor.value = new Date().getFullYear()
}

function dayTimelineBlocks(categoryId: number): TimelineBlock[] {
  return computeTimelineBlocks(occurrences.value.filter((o) => o.category_id === categoryId))
}

// Mobile (ver template, oculto desde sm:): una sola columna, sin separar por
// categoria. Respeta el mismo filtro que el grid de escritorio (con "All" se
// mezclan todas las categorias en la misma lista, por hora).
function mobileOccurrencesFor(hour: number): CalendarTaskOccurrence[] {
  const visibleIds = new Set(visibleCategories.value.map((c) => c.id))
  return occurrences.value.filter(
    (o) => visibleIds.has(o.category_id) && new Date(o.occurrence_at).getHours() === hour,
  )
}

function categoryName(categoryId: number): string {
  return categories.value.find((c) => c.id === categoryId)?.name ?? ''
}

// La vista arranca mostrando las 8am, pero las horas 5-7am siguen ahi arriba:
// alcanza con scrollear el cuadro (nunca la pagina completa, ver el wrapper
// con overflow-y-auto mas abajo). Existen dos layouts (mobile de una columna
// y el grid de escritorio) montados a la vez, alternados por CSS: se ubica
// cual de los dos esta realmente visible (offsetParent no nulo) antes de
// calcular el scroll.
const DEFAULT_VISIBLE_HOUR = 8
const gridScrollEl = ref<HTMLElement | null>(null)
const mobileHourRowEls: Record<number, HTMLElement | null> = {}
const desktopHourRowEls: Record<number, HTMLElement | null> = {}

function setMobileHourRowEl(hour: number, el: Element | null) {
  mobileHourRowEls[hour] = el as HTMLElement | null
}

function setDesktopHourRowEl(hour: number, el: Element | null) {
  desktopHourRowEls[hour] = el as HTMLElement | null
}

function visibleHourRowEl(hour: number): HTMLElement | null {
  const mobile = mobileHourRowEls[hour]
  if (mobile?.offsetParent) return mobile
  const desktop = desktopHourRowEls[hour]
  if (desktop?.offsetParent) return desktop
  return mobile ?? desktop ?? null
}

// Reusado por la vista semanal (su propio contenedor/filas, ver mas abajo):
// mide la posicion de target relativa a container y scrollea hasta ahi.
// offsetTop no sirve aca: depende del offsetParent, que no tiene por que ser
// el contenedor con scroll.
function scrollElementIntoContainer(container: HTMLElement | null, target: HTMLElement | null) {
  if (!container || !target) return
  const offset = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
  container.scrollTop = offset
}

function scrollToDefaultHour() {
  nextTick(() => scrollElementIntoContainer(gridScrollEl.value, visibleHourRowEl(DEFAULT_VISIBLE_HOUR)))
}

async function loadDay() {
  loading.value = true
  loadError.value = null
  try {
    occurrences.value = await listCalendarTasksForDay(currentDate.value)
    scrollToDefaultHour()
  } catch (err) {
    loadError.value = err instanceof ApiError ? err.message : 'Could not load this day.'
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    categories.value = await listCategories()
  } catch {
    // El grid queda sin columnas si falla; el error de loadDay ya se muestra.
  }
}

// Carga perezosa, igual que Weekly/Monthly: Daily ya no es la vista por
// defecto, asi que no hace falta pedirla si el usuario nunca la abre.
let dayLoadedOnce = false

function ensureDayLoaded() {
  if (dayLoadedOnce) return
  dayLoadedOnce = true
  loadDay()
}

watch(currentDate, () => {
  if (dayLoadedOnce) loadDay()
})
onMounted(() => {
  loadCategories()
  if (viewMode.value === 'DAILY') ensureDayLoaded()
  else if (viewMode.value === 'WEEKLY') ensureWeekLoaded()
  else if (viewMode.value === 'MONTHLY') ensureMonthLoaded()
  else if (viewMode.value === 'YEARLY') ensureYearLoaded()
})

// --- Vista semanal: mismo concepto, eje X = dias Lunes..Domingo en vez de
// categorias. Reusa detalle/edicion/borrado/alta-al-checklist tal cual estan
// definidos mas abajo (son agnosticos a que grilla los invoco). ---

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function mondayOf(dateIso: string): string {
  const d = parseIsoDate(dateIso)
  return formatIsoDate(addDays(d, -(isoWeekday(d) - 1)))
}

const weekStart = ref(mondayOf(todayIsoDate()))
const weekDays = computed(() => {
  const start = parseIsoDate(weekStart.value)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
})

function isTodayColumn(day: Date): boolean {
  return formatIsoDate(day) === todayIsoDate()
}

// Franja horizontal que marca la hora actual en la vista diaria: solo aplica
// si el dia que se esta viendo es hoy, y compara contra la hora entera real
// (de 1 a 2, de 2 a 3, etc.).
function isCurrentHourBlock(hour: number): boolean {
  return currentDate.value === todayIsoDate() && hour === new Date().getHours()
}

const weekOccurrences = ref<CalendarTaskOccurrence[]>([])
const weekEvents = ref<CalendarEventMarker[]>([])
const weekLoading = ref(false)
const weekLoadError = ref<string | null>(null)

function goToPreviousWeek() {
  weekStart.value = formatIsoDate(addDays(parseIsoDate(weekStart.value), -7))
}

function goToNextWeek() {
  weekStart.value = formatIsoDate(addDays(parseIsoDate(weekStart.value), 7))
}

function weekTimelineBlocks(dayIso: string): TimelineBlock[] {
  return computeTimelineBlocks(
    weekOccurrences.value.filter((o) => formatIsoDate(new Date(o.occurrence_at)) === dayIso),
  )
}

function weekEventsFor(dayIso: string): CalendarEventMarker[] {
  return weekEvents.value.filter((marker) => marker.marker_date === dayIso)
}

const weeklyGridScrollEl = ref<HTMLElement | null>(null)
const weeklyHourRowEls: Record<number, HTMLElement | null> = {}

function setWeeklyHourRowEl(hour: number, el: Element | null) {
  weeklyHourRowEls[hour] = el as HTMLElement | null
}

function scrollWeekToDefaultHour() {
  nextTick(() => scrollElementIntoContainer(weeklyGridScrollEl.value, weeklyHourRowEls[DEFAULT_VISIBLE_HOUR]))
}

async function loadWeek() {
  weekLoading.value = true
  weekLoadError.value = null
  try {
    const start = weekStart.value
    const end = formatIsoDate(addDays(parseIsoDate(start), 6))
    const [tasks, events] = await Promise.all([
      listCalendarTasksForRange(start, end),
      listCalendarEvents(start, end),
    ])
    weekOccurrences.value = tasks
    weekEvents.value = events
    scrollWeekToDefaultHour()
  } catch (err) {
    weekLoadError.value = err instanceof ApiError ? err.message : 'Could not load this week.'
  } finally {
    weekLoading.value = false
  }
}

// Carga perezosa: recien la primera vez que se entra a Weekly. Una vez
// cargada, cualquier cambio de semana (incluido "Today") vuelve a cargar.
let weekLoadedOnce = false

function ensureWeekLoaded() {
  if (weekLoadedOnce) return
  weekLoadedOnce = true
  loadWeek()
}

watch(viewMode, (mode) => {
  if (mode === 'DAILY') ensureDayLoaded()
  if (mode === 'WEEKLY') ensureWeekLoaded()
  if (mode === 'MONTHLY') ensureMonthLoaded()
  if (mode === 'YEARLY') ensureYearLoaded()
})
watch(weekStart, () => {
  if (weekLoadedOnce) loadWeek()
})

async function refreshCurrentView() {
  if (viewMode.value === 'WEEKLY') await loadWeek()
  else if (viewMode.value === 'MONTHLY') await loadMonth()
  else if (viewMode.value === 'YEARLY') await loadYear()
  else await loadDay()
}

// --- Vista mensual: calendario clasico Lunes..Domingo, con un panel lateral
// (no por celda) para el detalle completo del dia seleccionado. Reusa
// integramente detalle/edicion/borrado/alta-al-checklist definidos mas abajo. ---

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function firstOfMonth(dateIso: string): string {
  const d = parseIsoDate(dateIso)
  return formatIsoDate(new Date(d.getFullYear(), d.getMonth(), 1))
}

function lastOfMonth(dateIso: string): string {
  const d = parseIsoDate(dateIso)
  return formatIsoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

interface MonthGridDay {
  isoDate: string
  dayNumber: number
  inMonth: boolean
}

const monthCursor = ref(firstOfMonth(todayIsoDate()))
const selectedDay = ref<string | null>(todayIsoDate())

// Pura (no lee monthCursor): reusada tal cual por la vista mensual (el mes
// mostrado) y por cada uno de los 12 mini-meses de la vista anual.
function computeMonthGridDays(monthStartIso: string): MonthGridDay[] {
  const monthIndex = parseIsoDate(monthStartIso).getMonth()
  const gridStart = parseIsoDate(mondayOf(monthStartIso))
  const gridEnd = addDays(parseIsoDate(mondayOf(lastOfMonth(monthStartIso))), 6)

  const days: MonthGridDay[] = []
  for (let current = gridStart; current <= gridEnd; current = addDays(current, 1)) {
    days.push({
      isoDate: formatIsoDate(current),
      dayNumber: current.getDate(),
      inMonth: current.getMonth() === monthIndex,
    })
  }
  return days
}

const monthGridDays = computed<MonthGridDay[]>(() => computeMonthGridDays(monthCursor.value))

const monthLabel = computed(() => {
  const d = parseIsoDate(monthCursor.value)
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
})

const monthOccurrences = ref<CalendarTaskOccurrence[]>([])
const monthEventRanges = ref<CalendarEventRange[]>([])
const monthLoading = ref(false)
const monthLoadError = ref<string | null>(null)

function goToPreviousMonth() {
  const d = parseIsoDate(monthCursor.value)
  monthCursor.value = formatIsoDate(new Date(d.getFullYear(), d.getMonth() - 1, 1))
}

function goToNextMonth() {
  const d = parseIsoDate(monthCursor.value)
  monthCursor.value = formatIsoDate(new Date(d.getFullYear(), d.getMonth() + 1, 1))
}

function monthOccurrencesFor(dayIso: string): CalendarTaskOccurrence[] {
  return monthOccurrences.value
    .filter((o) => formatIsoDate(new Date(o.occurrence_at)) === dayIso)
    .sort((a, b) => new Date(a.occurrence_at).getTime() - new Date(b.occurrence_at).getTime())
}

interface MonthDayEvent {
  key: string
  name: string
  detail: string | null
  label: 'Holiday' | 'Starts' | 'Ends' | null
  color: string
}

// Paleta de colores: el indice 0 (naranja) queda reservado para festivos;
// el resto se asigna de forma ESTABLE por id de evento (no por posicion
// dentro de un dia puntual), para que un mismo evento se vea siempre del
// mismo color sin importar el dia o con que otro evento se cruce — y ese
// mismo color se reusa tal cual en el panel lateral. Colores en hex (no
// clases de Tailwind) para poder combinarlos con un canal de alpha propio
// via :style, sin depender del escaneo estatico de clases de Tailwind.
const EVENT_COLORS = ['#f97316', '#8b5cf6', '#0ea5e9', '#ec4899', '#f59e0b']

function eventColor(range: CalendarEventRange): string {
  if (range.code === 'HOLIDAY') return EVENT_COLORS[0]
  return EVENT_COLORS[1 + (range.id % (EVENT_COLORS.length - 1))]
}

// Agrega un canal de alpha (2 digitos hex) a un color "#rrggbb".
function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`
}

// A diferencia de los marcadores de la vista semanal (solo inicio/fin), aca
// un evento aparece en el panel de CUALQUIER dia que cubra, con el nombre y
// detalle completos (aca SI se muestra informacion completa) y sin ninguna
// accion posible. El label solo marca los bordes; un dia intermedio no lleva
// label, pero igual muestra la info. El color es el mismo eventColor() que
// pinta la celda de ese evento en la grilla.
function monthEventsFor(dayIso: string): MonthDayEvent[] {
  const events: MonthDayEvent[] = []
  for (const range of monthEventRanges.value) {
    if (dayIso < range.first_day || dayIso > range.last_day) continue
    const isHoliday = range.code === 'HOLIDAY'
    const isStart = range.first_day === dayIso
    const isEnd = range.last_day === dayIso
    events.push({
      key: `${range.source}-${range.id}`,
      name: range.name,
      detail: range.detail,
      label: isHoliday ? 'Holiday' : isStart && isEnd ? null : isStart ? 'Starts' : isEnd ? 'Ends' : null,
      color: eventColor(range),
    })
  }
  return events
}

function monthCellRangesFor(dayIso: string): CalendarEventRange[] {
  return monthEventRanges.value.filter((range) => range.first_day <= dayIso && dayIso <= range.last_day)
}

interface MonthCellVisuals {
  tintColor: string
  stripeColors: string[]
}

// Pura (recibe los ranges ya filtrados): fondo de la celda = color del
// primer evento (festivo siempre primero, y siempre naranja); el resto de
// eventos que se crucen ese mismo dia se muestran como rayas verticales a
// la izquierda, una por evento, cada una con su propio color (el mismo
// eventColor() de siempre, nunca reasignado por posicion), para que ninguno
// quede completamente oculto detras del fondo. Si sobran mas eventos que
// colores disponibles, los de mas se descartan (permitido explicitamente).
// Reusada tal cual por la vista mensual y por cada mini-mes de la anual.
function computeCellVisuals(ranges: CalendarEventRange[]): MonthCellVisuals {
  if (!ranges.length) return { tintColor: '', stripeColors: [] }

  const holiday = ranges.find((r) => r.code === 'HOLIDAY')
  const primary = holiday ?? ranges[0]
  const rest = ranges.filter((r) => r !== primary).slice(0, EVENT_COLORS.length - 1)

  return { tintColor: eventColor(primary), stripeColors: rest.map((r) => eventColor(r)) }
}

function monthCellVisuals(dayIso: string): MonthCellVisuals {
  return computeCellVisuals(monthCellRangesFor(dayIso))
}

function selectDay(day: MonthGridDay) {
  if (!day.inMonth) return
  selectedDay.value = day.isoDate
}

async function loadMonth() {
  monthLoading.value = true
  monthLoadError.value = null
  try {
    const start = monthCursor.value
    const end = lastOfMonth(start)
    const [tasks, ranges] = await Promise.all([
      listCalendarTasksForRange(start, end),
      listCalendarEventRanges(start, end),
    ])
    monthOccurrences.value = tasks
    monthEventRanges.value = ranges
  } catch (err) {
    monthLoadError.value = err instanceof ApiError ? err.message : 'Could not load this month.'
  } finally {
    monthLoading.value = false
  }
}

let monthLoadedOnce = false

function ensureMonthLoaded() {
  if (monthLoadedOnce) return
  monthLoadedOnce = true
  loadMonth()
}

watch(monthCursor, () => {
  const start = monthCursor.value
  const end = lastOfMonth(start)
  const today = todayIsoDate()
  selectedDay.value = today >= start && today <= end ? today : null
  if (monthLoadedOnce) loadMonth()
})

function openMonthFromYear(monthIndex0: number) {
  monthCursor.value = formatIsoDate(new Date(yearCursor.value, monthIndex0, 1))
  viewMode.value = 'MONTHLY'
}

// --- Vista anual: los 12 meses del anio, compactos, coloreados igual que
// Monthly (misma computeCellVisuals/eventColor), sin edicion/borrado ni
// hover: un click en cualquier dia navega a Daily con esa fecha (tenga o no
// tareas/eventos), y el boton de cada mes navega a Monthly. ---

const yearCursor = ref(new Date().getFullYear())
const yearEventRanges = ref<CalendarEventRange[]>([])
const yearLoading = ref(false)
const yearLoadError = ref<string | null>(null)

// Filtro por tipo de evento (solo Yearly): lista fija de nombre amigable por
// code, para que el menu no cambie de forma al navegar entre anios. Un code
// que llegue de la base y no este en KNOWN_EVENT_CODES (incluido null) cae
// en "Others". Multi-seleccion con checks; "All" marca/desmarca todos los
// demas a la vez y por defecto arrancan todos marcados.
type EventTypeValue = 'HOLIDAY' | 'SPECIAL_DATE' | 'TRAVEL' | 'VACATION' | 'BIRTHDAY' | 'OTHERS'

const EVENT_TYPE_OPTIONS: { value: EventTypeValue; label: string }[] = [
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'SPECIAL_DATE', label: 'Special date' },
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'VACATION', label: 'Vacation' },
  { value: 'BIRTHDAY', label: 'Birthday' },
  { value: 'OTHERS', label: 'Others' },
]
const KNOWN_EVENT_CODES: string[] = ['HOLIDAY', 'SPECIAL_DATE', 'TRAVEL', 'VACATION', 'BIRTHDAY']

const selectedEventTypes = ref<Set<EventTypeValue>>(new Set(EVENT_TYPE_OPTIONS.map((option) => option.value)))
const eventFilterMenuOpen = ref(false)

const allEventTypesSelected = computed(() => selectedEventTypes.value.size === EVENT_TYPE_OPTIONS.length)

function eventFilterSummaryLabel(): string {
  if (allEventTypesSelected.value) return 'All'
  if (selectedEventTypes.value.size === 0) return 'None'
  return `${selectedEventTypes.value.size} selected`
}

function toggleAllEventTypes() {
  selectedEventTypes.value = allEventTypesSelected.value
    ? new Set()
    : new Set(EVENT_TYPE_OPTIONS.map((option) => option.value))
}

function toggleEventType(value: EventTypeValue) {
  const next = new Set(selectedEventTypes.value)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  selectedEventTypes.value = next
}

function normalizedEventCode(range: CalendarEventRange): EventTypeValue {
  return range.code && KNOWN_EVENT_CODES.includes(range.code) ? (range.code as EventTypeValue) : 'OTHERS'
}

function goToPreviousYear() {
  yearCursor.value -= 1
}

function goToNextYear() {
  yearCursor.value += 1
}

function yearCellRangesFor(dayIso: string): CalendarEventRange[] {
  return yearEventRanges.value.filter(
    (range) =>
      range.first_day <= dayIso &&
      dayIso <= range.last_day &&
      selectedEventTypes.value.has(normalizedEventCode(range)),
  )
}

function yearCellVisuals(dayIso: string): MonthCellVisuals {
  return computeCellVisuals(yearCellRangesFor(dayIso))
}

function goToDayFromYear(day: MonthGridDay) {
  if (!day.inMonth) return
  currentDate.value = day.isoDate
  viewMode.value = 'DAILY'
}

// Hover (solo lectura, sin acciones): muestra los eventos/festivos de ese
// dia, cada uno con su nombre y el mismo color que ya tiene en la celda
// (eventColor), a diferencia del tooltip nativo anterior (sin color, texto
// plano). Las tareas no se muestran aca a proposito (solo eventos).
const hoveredDay = ref<string | null>(null)

function setHoveredDay(day: MonthGridDay) {
  hoveredDay.value = day.inMonth ? day.isoDate : null
}

function clearHoveredDay() {
  hoveredDay.value = null
}

function yearMonthGridDays(monthIndex0: number): MonthGridDay[] {
  return computeMonthGridDays(formatIsoDate(new Date(yearCursor.value, monthIndex0, 1)))
}

async function loadYear() {
  yearLoading.value = true
  yearLoadError.value = null
  try {
    const start = `${yearCursor.value}-01-01`
    const end = `${yearCursor.value}-12-31`
    yearEventRanges.value = await listCalendarEventRanges(start, end)
  } catch (err) {
    yearLoadError.value = err instanceof ApiError ? err.message : 'Could not load this year.'
  } finally {
    yearLoading.value = false
  }
}

let yearLoadedOnce = false

function ensureYearLoaded() {
  if (yearLoadedOnce) return
  yearLoadedOnce = true
  loadYear()
}

watch(yearCursor, () => {
  if (yearLoadedOnce) loadYear()
})

// --- Agregar tarea: misma funcionalidad que "Add record" > Task (ver
// QuickAddPage.vue), pero accesible directo desde el calendario, al lado de
// "Today", en las 4 vistas. La fecha por defecto depende de donde este
// parado el usuario: en Daily, el dia que esta viendo; en Weekly/Monthly/
// Yearly, la primera fecha de ese periodo que sea >= manana (si el periodo
// entero ya paso, se usa igual su primer dia, sin importar la regla de
// "manana"). ---

function firstAvailableDateFor(periodStart: string, periodEnd: string): string {
  const tomorrow = formatIsoDate(addDays(parseIsoDate(todayIsoDate()), 1))
  const candidate = tomorrow > periodStart ? tomorrow : periodStart
  return candidate > periodEnd ? periodStart : candidate
}

function defaultAddTaskDate(): string {
  if (viewMode.value === 'DAILY') return currentDate.value
  if (viewMode.value === 'WEEKLY') {
    return firstAvailableDateFor(weekStart.value, formatIsoDate(addDays(parseIsoDate(weekStart.value), 6)))
  }
  if (viewMode.value === 'MONTHLY') {
    return firstAvailableDateFor(monthCursor.value, lastOfMonth(monthCursor.value))
  }
  return firstAvailableDateFor(`${yearCursor.value}-01-01`, `${yearCursor.value}-12-31`)
}

interface AddTaskFormState {
  name: string
  categoryId: number | null
  importance: Importance
  date: string
  weekday: number
  hour: number
  minute: number
  ampm: 'AM' | 'PM'
  endHour: number
  endMinute: number
  endAmpm: 'AM' | 'PM'
  endTouched: boolean
  notify: boolean
  repeatEnabled: boolean
  repeatMode: RepeatMode
  addToChecklist: boolean
  detail: string
}

const addTaskForm = ref<AddTaskFormState | null>(null)
const addTaskSubmitting = ref(false)
const addTaskError = ref<string | null>(null)

const isAddTaskWeeklyRepeat = computed(
  () => !!addTaskForm.value?.repeatEnabled && addTaskForm.value.repeatMode === 'WEEKLY',
)

function openAddTask() {
  const defaultDate = defaultAddTaskDate()
  const personal = categories.value.find((c) => c.name.toLowerCase() === 'personal')
  addTaskForm.value = {
    name: '',
    categoryId: personal ? personal.id : (categories.value[0]?.id ?? null),
    importance: 'STANDARD',
    date: defaultDate,
    weekday: isoWeekday(parseIsoDate(defaultDate)),
    hour: 7,
    minute: 30,
    ampm: 'AM',
    endHour: 8,
    endMinute: 30,
    endAmpm: 'AM',
    endTouched: false,
    notify: true,
    repeatEnabled: false,
    repeatMode: 'WEEKLY',
    addToChecklist: false,
    detail: '',
  }
  addTaskError.value = null
}

function closeAddTask() {
  addTaskForm.value = null
}

function onAddTaskStartTimeChange() {
  if (!addTaskForm.value || addTaskForm.value.endTouched) return
  const startMinutes = minutesOfDay(addTaskForm.value.hour, addTaskForm.value.minute, addTaskForm.value.ampm)
  const defaultEndMinutes = Math.min(startMinutes + 60, 23 * 60 + 59)
  const { hour, minute, ampm } = clockFromMinutes(defaultEndMinutes)
  addTaskForm.value.endHour = hour
  addTaskForm.value.endMinute = minute
  addTaskForm.value.endAmpm = ampm
}

function onAddTaskEndTimeChange() {
  if (addTaskForm.value) addTaskForm.value.endTouched = true
}

async function submitAddTask() {
  if (!addTaskForm.value) return
  const form = addTaskForm.value
  const name = form.name.trim()
  const isWeekly = form.repeatEnabled && form.repeatMode === 'WEEKLY'

  addTaskError.value = null
  if (!name || !form.categoryId) {
    addTaskError.value = 'Name and category are required.'
    return
  }
  if (!isWeekly && !form.date) {
    addTaskError.value = 'Date is required.'
    return
  }

  const startMinutes = minutesOfDay(form.hour, form.minute, form.ampm)
  const endMinutes = minutesOfDay(form.endHour, form.endMinute, form.endAmpm)
  if (endMinutes <= startMinutes) {
    addTaskError.value = 'End time must be after start time, on the same day.'
    return
  }

  const anchorDate = isWeekly ? nextDateForWeekday(form.weekday) : parseIsoDate(form.date)
  const dateTime = buildDateTime(anchorDate, form.hour, form.minute, form.ampm)

  addTaskSubmitting.value = true
  try {
    await createCalendarTask({
      name,
      importance: form.importance,
      category_id: form.categoryId,
      notify: form.notify,
      repeat_mode: form.repeatEnabled ? form.repeatMode : null,
      scheduled_date: form.repeatEnabled ? null : dateTime.toISOString(),
      repeat_date: form.repeatEnabled ? dateTime.toISOString() : null,
      duration_minutes: endMinutes - startMinutes,
      add_to_checklist: form.addToChecklist,
      detail: form.detail.trim() || null,
    })
    closeAddTask()
    await refreshCurrentView()
  } catch (err) {
    addTaskError.value = err instanceof ApiError ? err.message : 'Could not save this task.'
  } finally {
    addTaskSubmitting.value = false
  }
}

// --- Detalle de una tarea: en el calendario (Daily/Weekly) el chip solo
// muestra el nombre; categoria, rango de fecha/hora, y las acciones de
// editar/eliminar/agregar al checklist viven aca (evita que un chip de
// duracion corta no tenga espacio para mostrarlas). ---

const detailTask = ref<CalendarTaskOccurrence | null>(null)
const detailCopyLabel = ref('Copy')

function openDetail(occurrence: CalendarTaskOccurrence) {
  detailCopyLabel.value = 'Copy'
  detailTask.value = occurrence
}

function closeDetail() {
  detailTask.value = null
}

async function copyDetail() {
  if (!detailTask.value?.detail) return
  try {
    await navigator.clipboard.writeText(detailTask.value.detail)
    detailCopyLabel.value = 'Copied!'
  } catch {
    detailCopyLabel.value = 'Could not copy'
  }
}

// Cierran el detalle antes de abrir edicion/borrado para no apilar modales.
function editDetailTask() {
  if (!detailTask.value) return
  const occurrence = detailTask.value
  closeDetail()
  openEdit(occurrence)
}

function deleteDetailTask() {
  if (!detailTask.value) return
  const occurrence = detailTask.value
  closeDetail()
  openDeleteConfirm(occurrence)
}

// --- Edicion: mismos campos que la creacion, salvo add_to_checklist y
// repeat_mode (no editables aca). Si la tarea repite, el selector de dia de
// semana/fecha se prellena desde el ancla real (scheduled_date/repeat_date),
// no desde esta ocurrencia puntual (que en modo MONTHLY puede venir recortada
// por el clamp de fin de mes). ---

const weekdayOptions = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
]
const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5)

interface EditFormState {
  taskId: number
  repeatMode: RepeatMode | null
  name: string
  categoryId: number | null
  importance: Importance
  notify: boolean
  detail: string
  date: string
  weekday: number
  hour: number
  minute: number
  ampm: 'AM' | 'PM'
  endHour: number
  endMinute: number
  endAmpm: 'AM' | 'PM'
}

const editForm = ref<EditFormState | null>(null)
const editSaving = ref(false)
const editError = ref<string | null>(null)

function to12Hour(date: Date): { hour: number; minute: number; ampm: 'AM' | 'PM' } {
  const ampm = date.getHours() < 12 ? 'AM' : 'PM'
  const hour = date.getHours() % 12 === 0 ? 12 : date.getHours() % 12
  return { hour, minute: date.getMinutes(), ampm }
}

function minutesOfDay(hour12: number, minute: number, ampm: 'AM' | 'PM'): number {
  const hour24 = (hour12 % 12) + (ampm === 'PM' ? 12 : 0)
  return hour24 * 60 + minute
}

// Inverso de minutesOfDay: dado un total de minutos desde medianoche, arma
// hora/minuto/AM-PM. Se usa para prellenar la hora final desde
// duration_minutes (siempre <= 1439, nunca cruza medianoche).
function clockFromMinutes(totalMinutes: number): { hour: number; minute: number; ampm: 'AM' | 'PM' } {
  const hour24 = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  const ampm = hour24 < 12 ? 'AM' : 'PM'
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { hour, minute, ampm }
}

function nextDateForWeekday(weekday: number, from: Date = new Date()): Date {
  const offset = (weekday - isoWeekday(from) + 7) % 7
  return addDays(from, offset)
}

function buildDateTime(anchorDate: Date, hour12: number, minute: number, ampm: 'AM' | 'PM'): Date {
  const hour24 = (hour12 % 12) + (ampm === 'PM' ? 12 : 0)
  const result = new Date(anchorDate)
  result.setHours(hour24, minute, 0, 0)
  return result
}

function openEdit(occurrence: CalendarTaskOccurrence) {
  const anchorIso = occurrence.repeat_date ?? occurrence.scheduled_date ?? occurrence.occurrence_at
  const anchor = new Date(anchorIso)
  const { hour, minute, ampm } = to12Hour(anchor)
  const endMinutes = minutesOfDay(hour, minute, ampm) + occurrence.duration_minutes
  const { hour: endHour, minute: endMinute, ampm: endAmpm } = clockFromMinutes(endMinutes)
  editForm.value = {
    taskId: occurrence.id,
    repeatMode: occurrence.repeat_mode,
    name: occurrence.name,
    categoryId: occurrence.category_id,
    importance: occurrence.importance,
    notify: occurrence.notify,
    detail: occurrence.detail ?? '',
    date: formatIsoDate(anchor),
    weekday: isoWeekday(anchor),
    hour,
    minute,
    ampm,
    endHour,
    endMinute,
    endAmpm,
  }
  editError.value = null
}

function closeEdit() {
  editForm.value = null
}

async function submitEdit() {
  if (!editForm.value) return
  const form = editForm.value
  const name = form.name.trim()
  const isWeekly = form.repeatMode === 'WEEKLY'

  if (!name || !form.categoryId) {
    editError.value = 'Name and category are required.'
    return
  }
  if (!isWeekly && !form.date) {
    editError.value = 'Date is required.'
    return
  }

  const startMinutes = minutesOfDay(form.hour, form.minute, form.ampm)
  const endMinutes = minutesOfDay(form.endHour, form.endMinute, form.endAmpm)
  if (endMinutes <= startMinutes) {
    editError.value = 'End time must be after start time, on the same day.'
    return
  }

  const anchorDate = isWeekly ? nextDateForWeekday(form.weekday) : parseIsoDate(form.date)
  const dateTime = buildDateTime(anchorDate, form.hour, form.minute, form.ampm)

  editSaving.value = true
  editError.value = null
  try {
    await updateCalendarTask(form.taskId, {
      name,
      importance: form.importance,
      category_id: form.categoryId,
      notify: form.notify,
      detail: form.detail.trim() || null,
      scheduled_date: form.repeatMode ? null : dateTime.toISOString(),
      repeat_date: form.repeatMode ? dateTime.toISOString() : null,
      duration_minutes: endMinutes - startMinutes,
    })
    closeEdit()
    await refreshCurrentView()
  } catch (err) {
    editError.value = err instanceof ApiError ? err.message : 'Could not save the task.'
  } finally {
    editSaving.value = false
  }
}

// --- Borrado: confirmacion, con check de "solo esta ocurrencia" cuando la
// tarea repite (marcado por defecto). ---

const deleteTarget = ref<CalendarTaskOccurrence | null>(null)
const deleteOnlyThisOccurrence = ref(true)
const deleteSaving = ref(false)
const deleteError = ref<string | null>(null)

function openDeleteConfirm(occurrence: CalendarTaskOccurrence) {
  deleteTarget.value = occurrence
  deleteOnlyThisOccurrence.value = true
  deleteError.value = null
}

function closeDeleteConfirm() {
  deleteTarget.value = null
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const target = deleteTarget.value
  const occurrenceDate =
    target.repeat_mode && deleteOnlyThisOccurrence.value
      ? formatIsoDate(new Date(target.occurrence_at))
      : undefined

  deleteSaving.value = true
  deleteError.value = null
  try {
    await deleteCalendarTask(target.id, occurrenceDate)
    closeDeleteConfirm()
    await refreshCurrentView()
  } catch (err) {
    deleteError.value = err instanceof ApiError ? err.message : 'Could not delete the task.'
  } finally {
    deleteSaving.value = false
  }
}

// --- Alta retroactiva al checklist semanal ---

const syncingTaskId = ref<number | null>(null)
const syncResults = ref<Record<number, { message: string; isError: boolean }>>({})

async function addToChecklist(occurrence: CalendarTaskOccurrence) {
  syncingTaskId.value = occurrence.id
  try {
    const occurrenceDate = formatIsoDate(new Date(occurrence.occurrence_at))
    const result = await enableCalendarTaskChecklistSync(occurrence.id, occurrenceDate)
    occurrence.add_to_checklist = true
    syncResults.value[occurrence.id] = {
      message: result.added_to_current_week
        ? "Added to this week's checklist."
        : 'Saved — this will be added once a week covers this date.',
      isError: false,
    }
  } catch (err) {
    syncResults.value[occurrence.id] = {
      message: err instanceof ApiError ? err.message : 'Could not add this to the checklist.',
      isError: true,
    }
  } finally {
    syncingTaskId.value = null
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 sm:h-[calc(100vh-6.5rem)]">
    <div class="flex shrink-0 flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-foreground">Calendar</h1>
        <p class="text-sm text-muted">Your calendar tasks, laid out by category and hour.</p>
      </div>

      <div class="flex items-center gap-2">
        <BaseButton variant="secondary" type="button" @click="goToToday">Today</BaseButton>
        <BaseButton variant="primary" type="button" @click="openAddTask">
          <Plus class="h-4 w-4" />
          Add task
        </BaseButton>

        <div v-if="viewMode === 'YEARLY'" class="relative">
          <BaseButton variant="secondary" type="button" @click="eventFilterMenuOpen = !eventFilterMenuOpen">
            {{ eventFilterSummaryLabel() }}
            <ChevronDown class="h-4 w-4" />
          </BaseButton>
          <div v-if="eventFilterMenuOpen" class="fixed inset-0 z-10" @click="eventFilterMenuOpen = false" />
          <div
            v-if="eventFilterMenuOpen"
            class="absolute left-0 z-20 mt-1 w-48 rounded-lg border border-subtle bg-surface py-1 shadow-lg"
          >
            <label class="flex w-full cursor-pointer items-center gap-2 border-b border-subtle px-3 py-2 text-sm font-medium hover:bg-surface-hover">
              <input type="checkbox" :checked="allEventTypesSelected" @change="toggleAllEventTypes" />
              All
            </label>
            <label
              v-for="option in EVENT_TYPE_OPTIONS"
              :key="option.value"
              class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-surface-hover"
            >
              <input
                type="checkbox"
                :checked="selectedEventTypes.has(option.value)"
                @change="toggleEventType(option.value)"
              />
              {{ option.label }}
            </label>
          </div>
        </div>

        <div class="relative">
          <BaseButton variant="secondary" type="button" @click="viewMenuOpen = !viewMenuOpen">
            {{ viewLabel(viewMode) }}
            <ChevronDown class="h-4 w-4" />
          </BaseButton>
          <div v-if="viewMenuOpen" class="fixed inset-0 z-10" @click="viewMenuOpen = false" />
          <div
            v-if="viewMenuOpen"
            class="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-subtle bg-surface py-1 shadow-lg"
          >
            <button
              v-for="option in VIEW_OPTIONS"
              :key="option.value"
              type="button"
              class="block w-full px-3 py-2 text-left text-sm hover:bg-surface-hover"
              :class="viewMode === option.value ? 'font-medium text-accent-text' : 'text-foreground'"
              @click="selectView(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <template v-if="viewMode === 'DAILY'">
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          title="Previous day"
          class="rounded-lg border border-subtle p-2 text-muted transition-colors hover:text-foreground"
          @click="goToPreviousDay"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <span class="text-sm font-medium text-foreground">{{ formatDateLong(parseIsoDate(currentDate)) }}</span>
        <button
          type="button"
          title="Next day"
          class="rounded-lg border border-subtle p-2 text-muted transition-colors hover:text-foreground"
          @click="goToNextDay"
        >
          <ChevronRight class="h-4 w-4" />
        </button>

        <select
          v-model="selectedCategoryId"
          class="ml-auto rounded-lg border border-subtle bg-surface px-2 py-1.5 text-sm"
        >
          <option value="ALL">All categories</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </div>

      <p v-if="loading" class="py-6 text-center text-sm text-muted">Loading...</p>
      <p v-else-if="loadError" class="py-6 text-center text-sm text-ruby-text">{{ loadError }}</p>
      <p v-else-if="!categories.length" class="py-6 text-center text-sm text-muted">
        No categories yet — create one from the checklist page first.
      </p>

      <div
        v-else
        ref="gridScrollEl"
        class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-xl border border-subtle bg-surface"
      >
        <!-- Mobile: una sola columna, tareas de todas las categorias visibles
             mezcladas por hora (sin separar en columnas). Respeta el mismo
             filtro que la vista de escritorio. -->
        <div class="divide-y divide-subtle sm:hidden">
          <div
            v-for="hour in HOURS"
            :key="hour"
            :ref="(el) => setMobileHourRowEl(hour, el as Element | null)"
            class="flex gap-2 p-2"
            :class="isCurrentHourBlock(hour) ? 'bg-accent/10' : ''"
          >
            <div class="w-11 shrink-0 pt-0.5 text-right text-[10px] text-muted">{{ hourLabel(hour) }}</div>
            <div class="min-w-0 flex-1 space-y-1">
              <p v-if="!mobileOccurrencesFor(hour).length" class="text-[10px] text-muted/50">—</p>
              <div
                v-for="occurrence in mobileOccurrencesFor(hour)"
                :key="occurrence.id"
                class="min-w-0 cursor-pointer truncate rounded-md border border-subtle bg-background px-1.5 py-1 text-xs text-foreground"
                :title="occurrence.name"
                @click="openDetail(occurrence)"
              >
                {{ occurrence.name }}
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop/tablet (sm+): una columna por categoria visible. Linea de
             tiempo continua: cada tarea se posiciona segun su hora de inicio
             y su duracion real (ver computeTimelineBlocks), en vez de ocupar
             todo el bloque de una hora. -->
        <div
          class="hidden text-sm sm:grid"
          :style="{ gridTemplateColumns: `3.25rem repeat(${visibleCategories.length}, minmax(0, 1fr))` }"
        >
          <div class="sticky top-0 z-10 border-b border-r border-subtle bg-surface"></div>
          <div
            v-for="category in visibleCategories"
            :key="category.id"
            class="sticky top-0 z-10 min-w-0 truncate border-b border-subtle bg-surface p-1.5 text-center text-xs font-semibold text-foreground sm:text-sm"
            :title="category.name"
          >
            {{ category.name }}
          </div>

          <!-- Columna de horas: una fila por hora, altura fija (para que
               calce en pixeles exactos con el overlay de cada categoria). -->
          <div>
            <div
              v-for="hour in HOURS"
              :key="hour"
              :ref="(el) => setDesktopHourRowEl(hour, el as Element | null)"
              :style="{ height: `${HOUR_ROW_HEIGHT}px` }"
              class="border-b border-r border-subtle p-1 text-right text-[10px] text-muted sm:p-2 sm:text-xs"
              :class="isCurrentHourBlock(hour) ? 'bg-accent/10' : ''"
            >
              {{ hourLabel(hour) }}
            </div>
          </div>

          <!-- Una columna por categoria: fondo con separadores de hora +
               overlay de tareas posicionadas por su horario real. -->
          <div v-for="category in visibleCategories" :key="category.id" class="relative min-w-0">
            <div
              v-for="hour in HOURS"
              :key="hour"
              :style="{ height: `${HOUR_ROW_HEIGHT}px` }"
              class="border-b border-subtle"
              :class="isCurrentHourBlock(hour) ? 'bg-accent/10' : ''"
            ></div>

            <div class="pointer-events-none absolute inset-0">
              <div
                v-for="block in dayTimelineBlocks(category.id)"
                :key="block.occurrence.id"
                class="pointer-events-auto absolute flex cursor-pointer items-center overflow-hidden rounded-md border border-subtle bg-background px-1.5 py-1 text-xs"
                :style="{
                  top: `${block.top}px`,
                  height: `${block.height}px`,
                  left: `${block.leftPercent}%`,
                  width: `${block.widthPercent}%`,
                }"
                :title="block.occurrence.name"
                @click="openDetail(block.occurrence)"
              >
                <span class="min-w-0 truncate text-foreground">{{ block.occurrence.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="viewMode === 'WEEKLY'">
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          title="Previous week"
          class="rounded-lg border border-subtle p-2 text-muted transition-colors hover:text-foreground"
          @click="goToPreviousWeek"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <span class="text-sm font-medium text-foreground">
          {{ formatDateLong(weekDays[0]) }} – {{ formatDateLong(weekDays[6]) }}
        </span>
        <button
          type="button"
          title="Next week"
          class="rounded-lg border border-subtle p-2 text-muted transition-colors hover:text-foreground"
          @click="goToNextWeek"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>

      <p v-if="weekLoading" class="py-6 text-center text-sm text-muted">Loading...</p>
      <p v-else-if="weekLoadError" class="py-6 text-center text-sm text-ruby-text">{{ weekLoadError }}</p>
      <p v-else-if="!categories.length" class="py-6 text-center text-sm text-muted">
        No categories yet — create one from the checklist page first.
      </p>

      <div
        v-else
        ref="weeklyGridScrollEl"
        class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-xl border border-subtle bg-surface"
      >
        <div class="grid text-sm" style="grid-template-columns: 3.25rem repeat(7, minmax(0, 1fr))">
          <div class="sticky top-0 z-10 border-b border-r border-subtle bg-surface"></div>
          <div
            v-for="(day, i) in weekDays"
            :key="i"
            class="sticky top-0 z-10 min-w-0 truncate border-b border-subtle p-1.5 text-center text-xs font-semibold sm:text-sm"
            :class="isTodayColumn(day) ? 'bg-accent/10 text-accent-text' : 'bg-surface text-foreground'"
          >
            {{ WEEKDAY_LABELS[i] }} {{ day.getDate() }}
          </div>

          <!-- Festivos y eventos (cld_events/cld_user_events): solo marcan el
               inicio y/o fin del rango, sin ninguna accion posible. -->
          <div class="border-b border-r border-subtle"></div>
          <div
            v-for="(day, i) in weekDays"
            :key="`ev-${i}`"
            class="min-h-[2rem] min-w-0 space-y-1 border-b border-subtle p-1"
            :class="isTodayColumn(day) ? 'bg-accent/10' : ''"
          >
            <div
              v-for="marker in weekEventsFor(formatIsoDate(day))"
              :key="`${marker.source}-${marker.id}-${marker.marker_type}`"
              :title="marker.detail || marker.name"
              class="truncate rounded-md border px-1.5 py-0.5 text-[10px]"
              :class="
                marker.code === 'HOLIDAY'
                  ? 'border-accent/40 bg-accent/10 text-accent-text'
                  : 'border-subtle bg-background text-muted'
              "
            >
              <template v-if="marker.marker_type === 'start'">▶ </template>
              <template v-else-if="marker.marker_type === 'end'">◀ </template>
              {{ marker.name }}
            </div>
          </div>

          <!-- Columna de horas: una fila por hora, altura fija (calza en
               pixeles exactos con el overlay de cada dia). -->
          <div class="border-r border-subtle">
            <div
              v-for="hour in HOURS"
              :key="hour"
              :ref="(el) => setWeeklyHourRowEl(hour, el as Element | null)"
              :style="{ height: `${HOUR_ROW_HEIGHT}px` }"
              class="border-b border-subtle p-1 text-right text-[10px] text-muted sm:p-2 sm:text-xs"
            >
              {{ hourLabel(hour) }}
            </div>
          </div>

          <!-- Un dia por columna: fondo con separadores de hora + overlay de
               tareas posicionadas por su horario real (linea de tiempo
               continua, igual que Daily). -->
          <div
            v-for="(day, i) in weekDays"
            :key="`d-${i}`"
            class="relative min-w-0"
            :class="isTodayColumn(day) ? 'bg-accent/10' : ''"
          >
            <div
              v-for="hour in HOURS"
              :key="hour"
              :style="{ height: `${HOUR_ROW_HEIGHT}px` }"
              class="border-b border-subtle"
            ></div>

            <div class="pointer-events-none absolute inset-0">
              <div
                v-for="block in weekTimelineBlocks(formatIsoDate(day))"
                :key="block.occurrence.id"
                class="pointer-events-auto absolute flex cursor-pointer items-center overflow-hidden rounded-md border border-subtle bg-background px-1.5 py-1 text-xs"
                :style="{
                  top: `${block.top}px`,
                  height: `${block.height}px`,
                  left: `${block.leftPercent}%`,
                  width: `${block.widthPercent}%`,
                }"
                :title="block.occurrence.name"
                @click="openDetail(block.occurrence)"
              >
                <span class="min-w-0 truncate text-foreground">{{ block.occurrence.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="viewMode === 'MONTHLY'">
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          title="Previous month"
          class="rounded-lg border border-subtle p-2 text-muted transition-colors hover:text-foreground"
          @click="goToPreviousMonth"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <span class="text-sm font-medium text-foreground">{{ monthLabel }}</span>
        <button
          type="button"
          title="Next month"
          class="rounded-lg border border-subtle p-2 text-muted transition-colors hover:text-foreground"
          @click="goToNextMonth"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>

      <p v-if="monthLoading" class="py-6 text-center text-sm text-muted">Loading...</p>
      <p v-else-if="monthLoadError" class="py-6 text-center text-sm text-ruby-text">{{ monthLoadError }}</p>
      <p v-else-if="!categories.length" class="py-6 text-center text-sm text-muted">
        No categories yet — create one from the checklist page first.
      </p>

      <div v-else class="flex flex-col gap-4 sm:flex-row">
        <div class="min-w-0 overflow-hidden rounded-xl border border-subtle bg-surface sm:flex-[2]">
          <div class="grid text-sm" style="grid-template-columns: repeat(7, minmax(0, 1fr))">
            <div
              v-for="label in WEEKDAY_LABELS"
              :key="label"
              class="border-b border-subtle p-1.5 text-center text-xs font-semibold text-foreground sm:text-sm"
            >
              {{ label }}
            </div>

            <button
              v-for="day in monthGridDays"
              :key="day.isoDate"
              type="button"
              :disabled="!day.inMonth"
              class="relative min-h-[3.25rem] min-w-0 space-y-1 border-b border-r border-subtle p-1 text-left align-top sm:min-h-[6rem] sm:p-1.5"
              :class="
                day.inMonth
                  ? selectedDay === day.isoDate
                    ? 'ring-2 ring-inset ring-accent-text'
                    : ''
                  : 'cursor-default opacity-30'
              "
              :style="
                day.inMonth && monthCellVisuals(day.isoDate).tintColor
                  ? { backgroundColor: withAlpha(monthCellVisuals(day.isoDate).tintColor, '26') }
                  : {}
              "
              @click="selectDay(day)"
            >
              <div
                v-if="day.inMonth && monthCellVisuals(day.isoDate).stripeColors.length"
                class="pointer-events-none absolute inset-y-0 left-0 flex"
              >
                <span
                  v-for="(color, i) in monthCellVisuals(day.isoDate).stripeColors"
                  :key="i"
                  class="h-full w-1"
                  :style="{ backgroundColor: color }"
                ></span>
              </div>

              <span
                class="relative inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] sm:h-6 sm:w-6 sm:text-xs"
                :class="day.inMonth && day.isoDate === todayIsoDate() ? 'bg-accent font-semibold text-white' : 'text-muted'"
              >
                {{ day.dayNumber }}
              </span>

              <template v-if="day.inMonth">
                <div class="hidden space-y-0.5 sm:block">
                  <p
                    v-for="occurrence in monthOccurrencesFor(day.isoDate).slice(0, 2)"
                    :key="occurrence.id"
                    class="flex items-center truncate rounded bg-background px-1 py-0.5 text-[10px] text-foreground"
                  >
                    {{ occurrence.name }}
                  </p>
                  <p v-if="monthOccurrencesFor(day.isoDate).length > 2" class="text-[10px] text-muted">
                    +{{ monthOccurrencesFor(day.isoDate).length - 2 }} more
                  </p>
                </div>
                <div
                  v-if="monthOccurrencesFor(day.isoDate).length"
                  class="h-1.5 w-1.5 rounded-full bg-accent-text sm:hidden"
                ></div>
              </template>
            </button>
          </div>
        </div>

        <div class="min-w-0 rounded-xl border border-subtle bg-surface p-3 sm:flex-1">
          <p v-if="!selectedDay" class="text-sm text-muted">Select a day to see its tasks and events.</p>
          <template v-else>
            <h3 class="mb-3 text-sm font-semibold text-foreground">{{ formatDateLong(parseIsoDate(selectedDay)) }}</h3>

            <p
              v-if="!monthOccurrencesFor(selectedDay).length && !monthEventsFor(selectedDay).length"
              class="text-sm text-muted"
            >
              Nothing scheduled for this day.
            </p>

            <div class="space-y-2">
              <div
                v-for="marker in monthEventsFor(selectedDay)"
                :key="marker.key"
                class="rounded-md border px-2 py-1.5 text-xs"
                :style="{ backgroundColor: withAlpha(marker.color, '1a'), borderColor: withAlpha(marker.color, '66') }"
              >
                <p class="font-medium text-foreground">
                  <template v-if="marker.label">{{ marker.label }}: </template>{{ marker.name }}
                </p>
                <p v-if="marker.detail" class="mt-0.5 text-muted">{{ marker.detail }}</p>
              </div>

              <div
                v-for="occurrence in monthOccurrencesFor(selectedDay)"
                :key="occurrence.id"
                class="min-w-0 rounded-md border border-subtle bg-background px-2 py-1.5 text-xs"
              >
                <p class="truncate text-[9px] uppercase tracking-wide text-accent-text">
                  {{ categoryName(occurrence.category_id) }}
                </p>
                <div class="flex items-center gap-1">
                  <span
                    class="min-w-0 flex-1 cursor-pointer truncate text-foreground"
                    :title="occurrence.name"
                    @click="openDetail(occurrence)"
                  >
                    {{ occurrence.name }}
                  </span>
                  <button
                    type="button"
                    title="Edit task"
                    class="shrink-0 rounded p-0.5 text-muted hover:bg-surface-hover hover:text-foreground"
                    @click="openEdit(occurrence)"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    title="Delete task"
                    class="shrink-0 rounded p-0.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
                    @click="openDeleteConfirm(occurrence)"
                  >
                    <Trash2 class="h-3 w-3" />
                  </button>
                </div>
                <div class="mt-0.5 flex items-center justify-between gap-1">
                  <span class="text-[10px] text-muted">{{ timeRangeLabel(occurrence) }}</span>
                  <button
                    v-if="!occurrence.add_to_checklist"
                    type="button"
                    :disabled="syncingTaskId === occurrence.id"
                    class="shrink-0 text-[10px] text-accent-text hover:underline disabled:opacity-50"
                    @click="addToChecklist(occurrence)"
                  >
                    + Checklist
                  </button>
                </div>
                <p
                  v-if="syncResults[occurrence.id]"
                  class="mt-0.5 text-[10px]"
                  :class="syncResults[occurrence.id].isError ? 'text-ruby-text' : 'text-accent-text'"
                >
                  {{ syncResults[occurrence.id].message }}
                </p>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>

    <template v-else-if="viewMode === 'YEARLY'">
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          title="Previous year"
          class="rounded-lg border border-subtle p-2 text-muted transition-colors hover:text-foreground"
          @click="goToPreviousYear"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <span class="text-sm font-medium text-foreground">{{ yearCursor }}</span>
        <button
          type="button"
          title="Next year"
          class="rounded-lg border border-subtle p-2 text-muted transition-colors hover:text-foreground"
          @click="goToNextYear"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>

      <p v-if="yearLoading" class="py-6 text-center text-sm text-muted">Loading...</p>
      <p v-else-if="yearLoadError" class="py-6 text-center text-sm text-ruby-text">{{ yearLoadError }}</p>
      <p v-else-if="!categories.length" class="py-6 text-center text-sm text-muted">
        No categories yet — create one from the checklist page first.
      </p>

      <div
        v-else
        class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-xl border border-subtle bg-surface p-3"
      >
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <div v-for="monthIndex in 12" :key="monthIndex" class="min-w-0 rounded-lg border border-subtle p-1.5">
            <div class="mb-1 flex items-center justify-between">
              <span class="text-xs font-semibold text-foreground">{{ MONTH_NAMES[monthIndex - 1] }}</span>
              <button
                type="button"
                title="Open month view"
                class="shrink-0 rounded p-0.5 text-muted hover:bg-surface-hover hover:text-foreground"
                @click="openMonthFromYear(monthIndex - 1)"
              >
                <ExternalLink class="h-3 w-3" />
              </button>
            </div>

            <div class="grid grid-cols-7 gap-px">
              <span
                v-for="label in WEEKDAY_LABELS"
                :key="label"
                class="text-center text-[8px] font-medium text-muted"
              >
                {{ label[0] }}
              </span>

              <button
                v-for="day in yearMonthGridDays(monthIndex - 1)"
                :key="day.isoDate"
                type="button"
                :disabled="!day.inMonth"
                class="relative aspect-square min-w-0 rounded text-[11px]"
                :class="day.inMonth ? '' : 'cursor-default opacity-30'"
                :style="
                  day.inMonth && yearCellVisuals(day.isoDate).tintColor
                    ? { backgroundColor: withAlpha(yearCellVisuals(day.isoDate).tintColor, '26') }
                    : {}
                "
                @click="goToDayFromYear(day)"
                @mouseenter="setHoveredDay(day)"
                @mouseleave="clearHoveredDay"
              >
                <div
                  v-if="day.inMonth && yearCellVisuals(day.isoDate).stripeColors.length"
                  class="pointer-events-none absolute inset-y-0 left-0 flex"
                >
                  <span
                    v-for="(color, i) in yearCellVisuals(day.isoDate).stripeColors"
                    :key="i"
                    class="h-full w-0.5"
                    :style="{ backgroundColor: color }"
                  ></span>
                </div>
                <span
                  class="relative inline-flex h-full w-full items-center justify-center rounded"
                  :class="day.inMonth && day.isoDate === todayIsoDate() ? 'bg-accent font-semibold text-white' : 'text-muted'"
                >
                  {{ day.dayNumber }}
                </span>

                <div
                  v-if="day.inMonth && hoveredDay === day.isoDate && yearCellRangesFor(day.isoDate).length"
                  class="pointer-events-none absolute left-1/2 top-full z-30 mt-1 w-max max-w-[11rem] -translate-x-1/2 space-y-0.5 rounded-md border border-subtle bg-surface px-2 py-1.5 text-left shadow-lg"
                >
                  <p
                    v-for="range in yearCellRangesFor(day.isoDate)"
                    :key="`${range.source}-${range.id}`"
                    class="flex items-center gap-1.5 text-[10px] text-foreground"
                  >
                    <span class="h-1.5 w-1.5 shrink-0 rounded-full" :style="{ backgroundColor: eventColor(range) }"></span>
                    <span class="truncate">{{ range.name }}</span>
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Detalle de tarea: nombre, categoria, rango de fecha/hora, detalle, y
         las acciones de editar/eliminar/agregar al checklist. -->
    <div
      v-if="detailTask"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeDetail"
    >
      <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
        <h3 class="mb-1 text-sm font-semibold text-foreground">{{ detailTask.name }}</h3>
        <p class="mb-3 text-xs text-muted">
          {{ categoryName(detailTask.category_id) }} · {{ formatDateLong(new Date(detailTask.occurrence_at)) }} ·
          {{ timeRangeLabel(detailTask) }}
        </p>
        <p class="whitespace-pre-wrap text-sm text-muted">
          {{ detailTask.detail || 'No details for this task.' }}
        </p>

        <p
          v-if="syncResults[detailTask.id]"
          class="mt-3 text-xs"
          :class="syncResults[detailTask.id].isError ? 'text-ruby-text' : 'text-accent-text'"
        >
          {{ syncResults[detailTask.id].message }}
        </p>

        <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-1">
            <button
              type="button"
              title="Edit task"
              class="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
              @click="editDetailTask"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Delete task"
              class="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-ruby-text"
              @click="deleteDetailTask"
            >
              <Trash2 class="h-4 w-4" />
            </button>
            <button
              v-if="!detailTask.add_to_checklist"
              type="button"
              :disabled="syncingTaskId === detailTask.id"
              class="ml-1 text-xs text-accent-text hover:underline disabled:opacity-50"
              @click="addToChecklist(detailTask)"
            >
              + Checklist
            </button>
          </div>

          <div class="flex items-center gap-2">
            <BaseButton v-if="detailTask.detail" variant="secondary" type="button" @click="copyDetail">
              <Copy class="h-4 w-4" />
              {{ detailCopyLabel }}
            </BaseButton>
            <BaseButton variant="success" type="button" @click="closeDetail">
              <Check class="h-4 w-4" />
              OK
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Editar tarea -->
    <div
      v-if="editForm"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeEdit"
    >
      <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
        <h3 class="mb-1 text-sm font-semibold text-foreground">Edit task</h3>
        <p v-if="editForm.repeatMode" class="mb-4 text-xs text-muted">
          Repeats {{ editForm.repeatMode.toLowerCase() }} — the recurrence itself can't be changed here.
        </p>

        <div class="space-y-3">
          <label class="block text-sm">
            <span class="mb-1 block text-muted">Name</span>
            <input
              v-model="editForm.name"
              type="text"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>

          <div class="grid grid-cols-2 gap-3">
            <label class="text-sm">
              <span class="mb-1 block text-muted">Category</span>
              <select
                v-model.number="editForm.categoryId"
                class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
              >
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </label>
            <label class="text-sm">
              <span class="mb-1 block text-muted">Importance</span>
              <select
                v-model="editForm.importance"
                class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
              >
                <option value="HIGH">High priority (2 pts)</option>
                <option value="STANDARD">Standard (1 pt)</option>
              </select>
            </label>
          </div>

          <label v-if="editForm.repeatMode !== 'WEEKLY'" class="block text-sm">
            <span class="mb-1 block text-muted">Date</span>
            <input
              v-model="editForm.date"
              type="date"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>
          <label v-else class="block text-sm">
            <span class="mb-1 block text-muted">Day of week</span>
            <select
              v-model.number="editForm.weekday"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            >
              <option v-for="day in weekdayOptions" :key="day.value" :value="day.value">
                {{ day.label }}
              </option>
            </select>
          </label>

          <div class="grid grid-cols-2 gap-3">
            <div class="text-sm">
              <span class="mb-1 block text-muted">Start time</span>
              <div class="grid grid-cols-3 gap-1">
                <select
                  v-model.number="editForm.hour"
                  class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                >
                  <option v-for="h in 12" :key="h" :value="h">{{ h }}</option>
                </select>
                <select
                  v-model.number="editForm.minute"
                  class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                >
                  <option v-for="m in minuteOptions" :key="m" :value="m">{{ String(m).padStart(2, '0') }}</option>
                </select>
                <select
                  v-model="editForm.ampm"
                  class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            <div class="text-sm">
              <span class="mb-1 block text-muted">End time</span>
              <div class="grid grid-cols-3 gap-1">
                <select
                  v-model.number="editForm.endHour"
                  class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                >
                  <option v-for="h in 12" :key="h" :value="h">{{ h }}</option>
                </select>
                <select
                  v-model.number="editForm.endMinute"
                  class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                >
                  <option v-for="m in minuteOptions" :key="m" :value="m">{{ String(m).padStart(2, '0') }}</option>
                </select>
                <select
                  v-model="editForm.endAmpm"
                  class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>

          <label class="flex items-center gap-2 text-sm text-muted">
            <input v-model="editForm.notify" type="checkbox" class="h-4 w-4 rounded border-subtle" />
            Notify me
          </label>

          <label class="block text-sm">
            <span class="mb-1 block text-muted">Details (optional)</span>
            <textarea
              v-model="editForm.detail"
              rows="3"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>

        <p v-if="editError" class="mt-3 text-sm text-ruby-text">{{ editError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <BaseButton variant="secondary" type="button" :disabled="editSaving" @click="closeEdit">
            Cancel
          </BaseButton>
          <BaseButton variant="primary" type="button" :disabled="editSaving" @click="submitEdit">
            {{ editSaving ? 'Saving...' : 'Save' }}
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Agregar tarea: misma funcionalidad que "Add record" > Task -->
    <div
      v-if="addTaskForm"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeAddTask"
    >
      <div class="w-full max-w-md rounded-xl border border-subtle bg-surface p-5">
        <h3 class="mb-4 text-sm font-semibold text-foreground">Add task</h3>

        <div class="space-y-3">
          <label class="block text-sm">
            <span class="mb-1 block text-muted">Name</span>
            <input
              v-model="addTaskForm.name"
              type="text"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>

          <div class="grid grid-cols-2 gap-3">
            <label class="text-sm">
              <span class="mb-1 block text-muted">Category</span>
              <select
                v-model.number="addTaskForm.categoryId"
                class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
              >
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </label>
            <label class="text-sm">
              <span class="mb-1 block text-muted">Importance</span>
              <select
                v-model="addTaskForm.importance"
                class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
              >
                <option value="HIGH">High priority (2 pts)</option>
                <option value="STANDARD">Standard (1 pt)</option>
              </select>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <label v-if="!isAddTaskWeeklyRepeat" class="text-sm">
              <span class="mb-1 block text-muted">Date</span>
              <input
                v-model="addTaskForm.date"
                type="date"
                class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
              />
            </label>
            <label v-else class="text-sm">
              <span class="mb-1 block text-muted">Day of week</span>
              <select
                v-model.number="addTaskForm.weekday"
                class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
              >
                <option v-for="day in weekdayOptions" :key="day.value" :value="day.value">
                  {{ day.label }}
                </option>
              </select>
            </label>
            <label class="text-sm">
              <span class="mb-1 block text-muted">Repeat</span>
              <span class="flex items-center gap-2 rounded-lg border border-subtle bg-background px-3 py-2">
                <input v-model="addTaskForm.repeatEnabled" type="checkbox" class="h-4 w-4 rounded border-subtle" />
                <span class="text-muted">Repeat task</span>
              </span>
            </label>
          </div>

          <label v-if="addTaskForm.repeatEnabled" class="block text-sm">
            <span class="mb-1 block text-muted">Repeat every</span>
            <select
              v-model="addTaskForm.repeatMode"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            >
              <option value="WEEKLY">Week (same day of week)</option>
              <option value="MONTHLY">Month (same day of month)</option>
              <option value="YEARLY">Year (same day and month)</option>
            </select>
          </label>

          <div class="grid grid-cols-2 gap-3">
            <div class="text-sm">
              <span class="mb-1 block text-muted">Start time</span>
              <div class="grid grid-cols-3 gap-1">
                <select
                  v-model.number="addTaskForm.hour"
                  class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                  @change="onAddTaskStartTimeChange"
                >
                  <option v-for="h in 12" :key="h" :value="h">{{ h }}</option>
                </select>
                <select
                  v-model.number="addTaskForm.minute"
                  class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                  @change="onAddTaskStartTimeChange"
                >
                  <option v-for="m in minuteOptions" :key="m" :value="m">{{ String(m).padStart(2, '0') }}</option>
                </select>
                <select
                  v-model="addTaskForm.ampm"
                  class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                  @change="onAddTaskStartTimeChange"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            <div class="text-sm">
              <span class="mb-1 block text-muted">End time</span>
              <div class="grid grid-cols-3 gap-1">
                <select
                  v-model.number="addTaskForm.endHour"
                  class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                  @change="onAddTaskEndTimeChange"
                >
                  <option v-for="h in 12" :key="h" :value="h">{{ h }}</option>
                </select>
                <select
                  v-model.number="addTaskForm.endMinute"
                  class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                  @change="onAddTaskEndTimeChange"
                >
                  <option v-for="m in minuteOptions" :key="m" :value="m">{{ String(m).padStart(2, '0') }}</option>
                </select>
                <select
                  v-model="addTaskForm.endAmpm"
                  class="w-full rounded-lg border border-subtle bg-background px-1 py-2 text-sm"
                  @change="onAddTaskEndTimeChange"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
            <label class="flex items-center gap-2 text-sm text-muted">
              <input v-model="addTaskForm.notify" type="checkbox" class="h-4 w-4 rounded border-subtle" />
              Notify me
            </label>
            <label class="flex items-center gap-2 text-sm text-muted">
              <input v-model="addTaskForm.addToChecklist" type="checkbox" class="h-4 w-4 rounded border-subtle" />
              Also add to this week's checklist
            </label>
          </div>

          <label class="block text-sm">
            <span class="mb-1 block text-muted">Details (optional)</span>
            <textarea
              v-model="addTaskForm.detail"
              rows="2"
              class="w-full rounded-lg border border-subtle bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>

        <p v-if="addTaskError" class="mt-3 text-sm text-ruby-text">{{ addTaskError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <BaseButton variant="secondary" type="button" :disabled="addTaskSubmitting" @click="closeAddTask">
            Cancel
          </BaseButton>
          <BaseButton variant="primary" type="button" :disabled="addTaskSubmitting" @click="submitAddTask">
            {{ addTaskSubmitting ? 'Saving...' : 'Save' }}
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Confirmar borrado -->
    <div
      v-if="deleteTarget"
      class="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeDeleteConfirm"
    >
      <div class="w-full max-w-sm rounded-xl border border-subtle bg-surface p-5">
        <h3 class="mb-2 text-sm font-semibold text-foreground">Delete "{{ deleteTarget.name }}"?</h3>
        <p class="text-sm text-muted">This can't be undone.</p>

        <label v-if="deleteTarget.repeat_mode" class="mt-3 flex items-center gap-2 text-sm text-muted">
          <input v-model="deleteOnlyThisOccurrence" type="checkbox" class="h-4 w-4 rounded border-subtle" />
          Delete only this occurrence (uncheck to delete the whole series)
        </label>

        <p v-if="deleteError" class="mt-3 text-sm text-ruby-text">{{ deleteError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <BaseButton variant="secondary" type="button" :disabled="deleteSaving" @click="closeDeleteConfirm">
            Cancel
          </BaseButton>
          <BaseButton
            variant="primary"
            type="button"
            :disabled="deleteSaving"
            class="!bg-ruby hover:!bg-ruby/90"
            @click="confirmDelete"
          >
            <X class="h-4 w-4" />
            {{ deleteSaving ? 'Deleting...' : 'Delete' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
