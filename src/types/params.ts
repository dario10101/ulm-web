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

/** Lo minimo para listarse en el panel generico. Sin `status` ni
 * `usage_count` es un catalogo que no se archiva: borrar es borrar (ej. la
 * plantilla de categorias para usuarios nuevos). */
export interface CatalogItem {
  id: number
  name: string
  status?: CatalogStatus
  usage_count?: number
}

/** Item con borrado hibrido (tags, categorias del usuario, fuentes...). */
export interface AdminCatalogItem extends CatalogItem {
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

/** Categoria de gasto del usuario o metodo de pago (mismos campos). */
export interface IconCatalogAdmin extends CategoryOption, AdminCatalogItem {}

/** Categoria de la plantilla para usuarios nuevos: sin status ni uso. */
export interface DefaultCategory extends CatalogItem {
  icon_key: string
  color_key: string
}

/** Lo que lista IconCatalogPanel: cualquiera de los dos anteriores. */
export type IconCatalogItem = IconCatalogAdmin | DefaultCategory

export interface IconCatalogWritePayload {
  name: string
  icon_key: string
  color_key: string
  /** No aplica a la plantilla (el backend lo ignora ahi). */
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
