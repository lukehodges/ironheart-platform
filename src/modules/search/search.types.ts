export type SearchResultType = 'customer' | 'booking'

export interface SearchResult {
  type: SearchResultType
  id: string
  label: string
  secondary: string | null
}

export interface GlobalSearchResult {
  results: SearchResult[]
  query: string
  totalFound: number
}
