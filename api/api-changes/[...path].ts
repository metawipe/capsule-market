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
    // Получаем путь из параметров (catch-all route)
    // В Vercel catch-all route параметр называется по имени файла (path)
    let path = '/'
    
    // Сначала пытаемся получить путь из query параметров
    if (req.query.path) {
      if (Array.isArray(req.query.path)) {
        const pathArray = req.query.path.filter(p => p !== '')
        path = pathArray.length > 0 ? '/' + pathArray.join('/') : '/'
      } else if (req.query.path) {
        path = '/' + req.query.path
      }
    }
    
    // Если путь все еще пустой или равен '/', извлекаем из URL
    if (path === '/' && req.url) {
      // Убираем /api/api-changes из начала URL
      let urlPath = req.url.split('?')[0] // Убираем query параметры
      urlPath = urlPath.replace(/^\/api\/api-changes/, '')
      if (urlPath && urlPath !== '/') {
        path = urlPath.startsWith('/') ? urlPath : '/' + urlPath
      }
    }
    
    // Если все еще пусто, используем корневой путь
    if (!path || path === '/') {
      path = '/'
    }
    
    // Добавляем query параметры, если есть (исключая параметр path)
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
    const queryString = queryParams.toString() ? '?' + queryParams.toString() : ''
    
    const url = `https://api.changes.tg${path}${queryString}`

    console.log(`[API Proxy] ${req.method} ${req.url} -> ${url}`)
    console.log(`[API Proxy] Query:`, req.query)
    console.log(`[API Proxy] Path:`, path)

    // Выполняем запрос к API
    const response = await fetch(url, {
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
      console.error(`[API Proxy] Received HTML instead of JSON. URL: ${url}`)
      res.status(500).json({ 
        error: 'Proxy error: received HTML instead of JSON',
        url: url
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
      message: error instanceof Error ? error.message : String(error) 
    })
  }
}

