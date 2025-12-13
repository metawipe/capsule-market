// В продакшене используем прокси через Vercel Functions, в dev - через Vite proxy
export const CHANGES_API_URL = '/api-changes'

// Helper для безопасного парсинга JSON с проверкой на HTML
async function safeJsonParse<T>(response: Response): Promise<T> {
  const text = await response.text()
  
  // Проверяем, что это не HTML
  if (text.trim().startsWith('<!')) {
    console.error('Received HTML instead of JSON:', text.substring(0, 200))
    throw new Error(`API returned HTML instead of JSON. This usually means the proxy is not working. Response: ${text.substring(0, 100)}`)
  }
  
  try {
    return JSON.parse(text) as T
  } catch (e) {
    console.error('Failed to parse JSON:', text.substring(0, 200))
    throw new Error(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`)
  }
}

export const changesApi = {
  /**
   * Get name list of all upgradable gifts
   */
  async getGifts(): Promise<string[]> {
    const res = await fetch(`${CHANGES_API_URL}/gifts`)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to fetch gifts: ${res.status} ${res.statusText}. Response: ${text.substring(0, 100)}`)
    }
    return safeJsonParse<string[]>(res)
  },

  /**
   * Get name->id mapping for gifts
   */
  async getIds(): Promise<Record<string, string>> {
    const res = await fetch(`${CHANGES_API_URL}/ids`)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to fetch ids: ${res.status} ${res.statusText}. Response: ${text.substring(0, 100)}`)
    }
    return safeJsonParse<Record<string, string>>(res)
  },

  /**
   * Get list of all gift backdrops
   */
  async getBackdrops(): Promise<string[]> {
    const res = await fetch(`${CHANGES_API_URL}/backdrops`)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to fetch backdrops: ${res.status} ${res.statusText}. Response: ${text.substring(0, 100)}`)
    }
    return safeJsonParse<string[]>(res)
  },

  /**
   * Get list of all gift symbols for a specific gift
   */
  async getSymbols(giftName: string): Promise<string[]> {
    const res = await fetch(`${CHANGES_API_URL}/symbols/${giftName}`)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to fetch symbols: ${res.status} ${res.statusText}. Response: ${text.substring(0, 100)}`)
    }
    return safeJsonParse<string[]>(res)
  },

  /**
   * Get list of all gift models for a specific gift
   */
  async getModels(giftName: string): Promise<string[]> {
    const res = await fetch(`${CHANGES_API_URL}/models/${giftName}`)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}. Response: ${text.substring(0, 100)}`)
    }
    return safeJsonParse<string[]>(res)
  },

  /**
   * Helper to get gift image URL
   */
  getGiftImageUrl(giftId: string): string {
    return `${CHANGES_API_URL}/original/${giftId}.png`
  },

  /**
   * Helper to get model image URL
   */
  getModelImageUrl(giftName: string, modelName: string): string {
    return `${CHANGES_API_URL}/model/${giftName}/${modelName}.png`
  },

  /**
   * Helper to get symbol image URL
   */
  getSymbolImageUrl(giftName: string, symbolName: string): string {
    return `${CHANGES_API_URL}/symbol/${giftName}/${symbolName}.png`
  }
}

