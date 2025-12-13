import { motion } from 'framer-motion'
import { hapticLight } from '../twa'
import { Modal } from '../ui/Modal'
import './symbol-modal.css'
import { useState, useEffect, useMemo } from 'react'

interface Symbol {
  name: string
  slug: string
  icon: string
}

interface SymbolModalProps {
  isOpen: boolean
  onClose: () => void
  selectedSymbols: string[]
  onSymbolsChange: (symbols: string[]) => void
}

// Глобальный кеш для символов
let symbolsCache: Symbol[] | null = null

export function SymbolModal({ 
  isOpen, 
  onClose, 
  selectedSymbols,
  onSymbolsChange
}: SymbolModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>(selectedSymbols)

  useEffect(() => {
    setSelected(selectedSymbols)
  }, [selectedSymbols])

  useEffect(() => {
    if (isOpen) {
      // Если символы уже загружены в кеше, используем их сразу
      if (symbolsCache && symbolsCache.length > 0) {
        setSymbols(symbolsCache)
        setLoading(false)
      } else {
        // Загружаем только если кеш пуст
        loadSymbols()
      }
    }
  }, [isOpen])

  const loadSymbols = async () => {
    try {
      setLoading(true)
      const response = await fetch('/symbols_list.json')
      if (!response.ok) {
        throw new Error('Failed to load symbols')
      }
      const data: Symbol[] = await response.json()
      
      // Сохраняем в кеш
      symbolsCache = data
      setSymbols(data)
    } catch (error) {
      console.error('Error loading symbols:', error)
    } finally {
      setLoading(false)
    }
  }

  // Сортируем: выбранные сверху, остальные по названию
  const sortedSymbols = useMemo(() => {
    const selectedList = symbols.filter(s => selected.includes(s.name))
    const unselectedList = symbols.filter(s => !selected.includes(s.name))
    
    selectedList.sort((a, b) => {
      const indexA = selected.indexOf(a.name)
      const indexB = selected.indexOf(b.name)
      return indexA - indexB
    })
    
    unselectedList.sort((a, b) => {
      const nameA = String(a.name || '')
      const nameB = String(b.name || '')
      return nameA.localeCompare(nameB)
    })
    
    return [...selectedList, ...unselectedList]
  }, [symbols, selected])

  const filteredSymbols = useMemo(() => {
    if (!searchQuery.trim()) return sortedSymbols
    const query = searchQuery.toLowerCase()
    return sortedSymbols.filter(s => s.name.toLowerCase().includes(query))
  }, [sortedSymbols, searchQuery])

  const handleToggleSymbol = (symbolName: string) => {
    hapticLight()
    const newSelected = selected.includes(symbolName)
      ? selected.filter(name => name !== symbolName)
      : [...selected, symbolName]
    setSelected(newSelected)
    // Сразу применяем изменения без кнопки Apply
    onSymbolsChange(newSelected)
  }

  const handleClear = () => {
    hapticLight()
    setSelected([])
    // Сразу применяем очистку
    onSymbolsChange([])
  }

  const handleClose = () => {
    hapticLight()
    // Уже применено при изменении, просто закрываем
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Symbol"
      className="symbol-modal__content"
      bodyClassName="symbol-modal__body"
    >
      <div className="symbol-modal__search">
        <div className="symbol-modal__search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <input
          type="text"
          className="symbol-modal__search-input"
          placeholder="Search by symbol"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="symbol-modal__body">
      {loading ? (
        <div className="symbol-modal__loading">
          <p>Loading symbols...</p>
        </div>
      ) : (
        <div className="symbol-modal__list">
          {filteredSymbols.map((symbol) => (
            <motion.div
              key={symbol.name}
                className={`symbol-modal__item ${selected.includes(symbol.name) ? 'symbol-modal__item--selected' : ''}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
                onClick={() => handleToggleSymbol(symbol.name)}
            >
                <div className="symbol-modal__item-label">
                <input
                  type="checkbox"
                  className="symbol-modal__checkbox"
                  checked={selected.includes(symbol.name)}
                    readOnly
                />
                <div className="symbol-modal__item-icon">
                  {symbol.icon ? (
                    <img src={symbol.icon} alt={symbol.name} loading="lazy" />
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#8E8E93' }}>
                      <path d="M12 7.5C12 7.5 12 2.5 16 2.5C20 2.5 20.5 7.5 16 9.5C18.5 9.5 22 10.5 21.5 14.5C21 18.5 16.5 18 15 16C15 16 16 21 12 21C8 21 9 16 9 16C7.5 18 3 18.5 2.5 14.5C2 10.5 5.5 9.5 8 9.5C3.5 7.5 4 2.5 8 2.5C12 2.5 12 7.5 12 7.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 12L12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="symbol-modal__item-content">
                  <div className="symbol-modal__item-name">{symbol.name}</div>
                  </div>
                </div>
            </motion.div>
          ))}
        </div>
      )}
      </div>

      <div className="symbol-modal__footer">
        <button 
          className="symbol-modal__btn symbol-modal__btn--close"
          onClick={handleClose}
        >
          Close
        </button>
        <button 
          className="symbol-modal__btn symbol-modal__btn--clear"
          onClick={handleClear}
        >
          Clear all
        </button>
      </div>
    </Modal>
  )
}
