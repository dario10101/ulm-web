export interface AiAnswer {
  answer: string
  model: string
}

export interface AiModel {
  id: string
  label: string
  description: string
  input_usd_per_1m: number
  output_usd_per_1m: number
}

export interface AiModels {
  models: AiModel[]
  default: string
}
