// Administracion de parametros. Debe calzar con ulm-core:
// app/schemas/finance.py (catalogos), app/schemas/calendar_event.py y
// app/schemas/user.py (AccessInfoRead).
import type { CategoryOption, ExpenseTagOption } from '@/types/expense'
import type { IncomeCatalogType, IncomeSourceOption, IncomeSubcategoryOption } from '@/types/income'

export type CatalogStatus = 'ENABLED' | 'DISABLED'

/** Borrado hibrido: sin registros se borra; con registros se archiva. */
export type CatalogDeleteResult = 'DELETED' | 'ARCHIVED'

export interface CatalogDeleteResponse {
  result: CatalogDeleteResult
}

/** Lo comun a todo item administrable (para el panel generico). */
export interface AdminCatalogItem {
  id: number
  name: string
  status: CatalogStatus
  /** Registros que lo usan: decide si "Delete" borra o archiva. */
  usage_count: number
}

export interface TagAdmin extends ExpenseTagOption, AdminCatalogItem {}

export interface TagWritePayload {
  name: string
  color_key: string
  status?: CatalogStatus
}

export interface IncomeSourceAdmin extends IncomeSourceOption, AdminCatalogItem {
  subcategory_count: number
}

export interface IncomeSourceWritePayload {
  name: string
  type: IncomeCatalogType
  status?: CatalogStatus
}

export interface IncomeSubcategoryAdmin extends IncomeSubcategoryOption, AdminCatalogItem {}

export interface IncomeSubcategoryWritePayload {
  name: string
  source_id: number
  status?: CatalogStatus
}

/** Categoria de gasto o metodo de pago (mismos campos). */
export interface IconCatalogAdmin extends CategoryOption, AdminCatalogItem {}

export interface IconCatalogWritePayload {
  name: string
  icon_key: string
  color_key: string
  status?: CatalogStatus
}

export type CldEventCode = 'HOLIDAY' | 'SPECIAL_DATE'

export interface CldEvent {
  id: number
  code: string
  first_day: string
  last_day: string
  name: string
  detail: string | null
}

export interface CldEventWritePayload {
  code: CldEventCode
  first_day: string
  last_day: string
  name: string
  detail?: string | null
}

/** Festivo que calcula la libreria; `event_id` null = no esta cargado. */
export interface OfficialHoliday {
  day: string
  name: string
  event_id: number | null
}

export interface CalendarYear {
  year: number
  country: string
  events: CldEvent[]
  official_holidays: OfficialHoliday[]
}

export interface AccessInfo {
  registration_mode: 'invite_only' | 'open'
  google_audience_url: string
}
