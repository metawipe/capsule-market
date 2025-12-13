// hooks/usePageTransition.ts
import { useState, useEffect } from 'react'

export function usePageTransition(activeTab: string, duration: number = 400) {
  const [displayTab, setDisplayTab] = useState(activeTab)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (activeTab !== displayTab && !isTransitioning) {
      setIsTransitioning(true)
      
      const timer = setTimeout(() => {
        setDisplayTab(activeTab)
        setIsTransitioning(false)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [activeTab, displayTab, isTransitioning, duration])

  return { displayTab, isTransitioning }
}