export interface Weight {
  id: number
  user_id: number
  weight_kg: number
  recorded_on: string
  note: string | null
  created_at: string
  updated_at: string | null
}

export interface WeightPage {
  items: Weight[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface WeightPayload {
  weight_kg: number
  recorded_on: string
  note?: string | null
}

export type WeightSummaryGroupBy = 'month' | 'day'

export interface WeightSummaryBucket {
  /** "YYYY-MM" (month) o "YYYY-MM-DD" (day). */
  key: string
  average_kg: number
  count: number
}

export interface WeightSummary {
  /** Solo periodos con registros; los huecos los rellena el cliente. */
  buckets: WeightSummaryBucket[]
  average_kg: number | null
  count: number
  /** Años con algun registro, de mas reciente a mas antiguo. */
  available_years: number[]
}
