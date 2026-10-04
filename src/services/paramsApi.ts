import { deleteJson, getJson, postJson, putJson } from '@/lib/http'
import type {
  AccessInfo,
  CalendarYear,
  CatalogDeleteResponse,
  CldEvent,
  CldEventWritePayload,
  IconCatalogAdmin,
  IconCatalogWritePayload,
  IncomeSourceAdmin,
  IncomeSourceWritePayload,
  IncomeSubcategoryAdmin,
  IncomeSubcategoryWritePayload,
  TagAdmin,
  TagWritePayload,
} from '@/types/params'

/**
 * CRUD de un catalogo administrable. Todos siguen la misma forma en el
 * backend (GET/POST en la coleccion, PUT/DELETE por id), asi que se arman con
 * una sola funcion en vez de repetir cuatro wrappers por catalogo.
 */
export interface CatalogApi<Item, Payload> {
  list: () => Promise<Item[]>
  create: (payload: Payload) => Promise<Item>
  update: (id: number, payload: Payload) => Promise<Item>
  /** Dice si se borro o se archivo (ver CatalogDeleteResult). */
  remove: (id: number) => Promise<CatalogDeleteResponse>
}

function catalogApi<Item, Payload>(path: string): CatalogApi<Item, Payload> {
  return {
    list: () => getJson<Item[]>(path),
    create: (payload) => postJson<Item>(path, payload),
    update: (id, payload) => putJson<Item>(`${path}/${id}`, payload),
    remove: (id) => deleteJson<CatalogDeleteResponse>(`${path}/${id}`),
  }
}

// --- Del dominio (permiso finances, datos del propio usuario) ---

export const tagsApi = catalogApi<TagAdmin, TagWritePayload>('/finances/tags')
export const incomeSourcesApi = catalogApi<IncomeSourceAdmin, IncomeSourceWritePayload>(
  '/finances/income-sources',
)
export const incomeSubcategoriesApi = catalogApi<
  IncomeSubcategoryAdmin,
  IncomeSubcategoryWritePayload
>('/finances/income-subcategories')

// --- Del sistema (solo admin) ---

export const expenseCategoriesApi = catalogApi<IconCatalogAdmin, IconCatalogWritePayload>(
  '/system/expense-categories',
)
export const paymentMethodsApi = catalogApi<IconCatalogAdmin, IconCatalogWritePayload>(
  '/system/payment-methods',
)

export function getAccessInfo(): Promise<AccessInfo> {
  return getJson<AccessInfo>('/system/access')
}

export function getCalendarYear(year: number): Promise<CalendarYear> {
  return getJson<CalendarYear>(`/system/calendar-events?year=${year}`)
}

export function importMissingHolidays(year: number): Promise<CalendarYear> {
  return postJson<CalendarYear>('/system/calendar-events/import-holidays', { year })
}

export function createCldEvent(payload: CldEventWritePayload): Promise<CldEvent> {
  return postJson<CldEvent>('/system/calendar-events', payload)
}

export function updateCldEvent(id: number, payload: CldEventWritePayload): Promise<CldEvent> {
  return putJson<CldEvent>(`/system/calendar-events/${id}`, payload)
}

export function deleteCldEvent(id: number): Promise<void> {
  return deleteJson<void>(`/system/calendar-events/${id}`)
}
