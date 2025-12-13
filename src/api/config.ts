/**
 * Конфигурация API
 */
export const API_CONFIG = {
  // URL backend API
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  
  // Таймаут запросов (мс)
  TIMEOUT: 30000,
  
  // Повторы при ошибке
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000,
}

