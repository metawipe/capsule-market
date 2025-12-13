import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Устанавливаем CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Обрабатываем preflight запросы
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  try {
    // Получаем путь из URL
    // В Vercel rewrite путь передается через заголовок x-vercel-rewrite или через URL
    // Запрос: /api-changes/gifts -> функция получает /api/api-changes, но оригинальный путь в req.url
    let path = '/'
    
    // Извлекаем путь из оригинального URL запроса
    // Если запрос был /api-changes/gifts, то req.url может быть /api/api-changes
    // Но нам нужен оригинальный путь /gifts
    // Проверяем заголовок x-vercel-original-path или используем query параметр
    const originalPath = req.headers['x-vercel-original-path'] || req.headers['x-invoke-path']
    
    if (originalPath) {
      // Убираем /api-changes из начала
      path = String(originalPath).replace(/^\/api-changes/, '') || '/'
    } else if (req.query.path) {
      // Fallback: проверяем query параметр
      if (Array.isArray(req.query.path)) {
        path = '/' + req.query.path.join('/')
      } else {
        path = '/' + String(req.query.path)
      }
    } else if (req.url) {
      // Последний fallback: извлекаем из URL
      const urlPath = req.url.split('?')[0]
      // Убираем /api/api-changes если есть
      path = urlPath.replace(/^\/api\/api-changes/, '').replace(/^\/api-changes/, '') || '/'
    }
    
    // Убираем query параметры для построения пути к API
    const [pathOnly, queryString] = path.split('?')
    const cleanPath = pathOnly || '/'
    
    // Сохраняем оригинальные query параметры (кроме path)
    const queryParams = new URLSearchParams()
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'path' && value) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, String(v)))
        } else {
          queryParams.append(key, String(value))
        }
      }
    })
    
    // Добавляем query параметры из URL, если есть
    if (queryString) {
      const urlParams = new URLSearchParams(queryString)
      urlParams.forEach((value, key) => {
        queryParams.append(key, value)
      })
    }
    
    const finalQuery = queryParams.toString() ? '?' + queryParams.toString() : ''
    const apiUrl = `https://api.changes.tg${cleanPath}${finalQuery}`

    console.log(`[API Proxy] ${req.method} ${req.url} -> ${apiUrl}`)
    console.log(`[API Proxy] Headers:`, {
      'x-vercel-original-path': req.headers['x-vercel-original-path'],
      'x-invoke-path': req.headers['x-invoke-path'],
      'x-vercel-rewrite': req.headers['x-vercel-rewrite'],
    })
    console.log(`[API Proxy] Query:`, req.query)
    console.log(`[API Proxy] Resolved path:`, cleanPath)

    // Выполняем запрос к API
    const response = await fetch(apiUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`[API Proxy] Error: ${response.status} ${response.statusText}`)
      res.status(response.status).json({ 
        error: 'API request failed', 
        status: response.status,
        statusText: response.statusText 
      })
      return
    }

    const data = await response.text()
    
    // Проверяем, что это не HTML (ошибка прокси)
    if (data.trim().startsWith('<!')) {
      console.error(`[API Proxy] Received HTML instead of JSON. URL: ${apiUrl}`)
      res.status(500).json({ 
        error: 'Proxy error: received HTML instead of JSON',
        url: apiUrl,
        receivedUrl: req.url
      })
      return
    }
    
    // Устанавливаем заголовки ответа
    const contentType = response.headers.get('Content-Type') || 'application/json'
    res.setHeader('Content-Type', contentType)
    res.status(response.status).send(data)
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error instanceof Error ? error.message : String(error),
      url: req.url
    })
  }
}
