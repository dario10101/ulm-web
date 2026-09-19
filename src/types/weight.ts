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
