/**
 * Типы данных для API
 */

export interface GiftPreview {
  id: string
  name: string
  price: number
  preview?: string
  models_count: number
  in_stock: boolean
  rating: number
  tags: string[]
  collection?: string
  backdrop?: string
  symbol?: string
}

export interface MarketResponse {
  total: number
  gifts: GiftPreview[]
}

export interface ModelInfo {
  id: number
  preview: string
  name?: string
}

export interface SymbolInfo {
  id: number
  preview: string
  name?: string
}

export interface BackdropInfo {
  id: number
  preview: string
  name?: string
}

export interface GiftDetail {
  id: string
  name: string
  api_name: string
  price: number
  in_stock: boolean
  rating: number
  models_count: number
  symbols_count: number
  backdrops_count: number
  models: ModelInfo[]
  symbols: SymbolInfo[]
  backdrops: BackdropInfo[]
  previews: string[]
}

export interface StatsResponse {
  total_gifts: number
  average_price: number
  min_price: number
  max_price: number
  in_stock_count: number
  low_stock_count: number
  average_rating: number
}

export interface SearchResponse {
  query: string
  total: number
  gifts: GiftPreview[]
}

export interface FilterResponse {
  filters: {
    min_price?: number
    max_price?: number
  }
  total: number
  gifts: GiftPreview[]
}

