import { useEffect, useRef } from 'react'
import lottie from 'lottie-web'
import pako from 'pako'

interface TgsPlayerProps {
  src: string
  className?: string
  width?: number
  height?: number
  loop?: boolean
  autoplay?: boolean
}

export function TgsPlayer({ 
  src, 
  className = '', 
  width = 64, 
  height = 64,
  loop = true,
  autoplay = true 
}: TgsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const loadTgs = async () => {
      try {
        const response = await fetch(src)
        const arrayBuffer = await response.arrayBuffer()
        
        const decompressed = pako.inflate(new Uint8Array(arrayBuffer), { to: 'string' })
        
        const animationData = JSON.parse(typeof decompressed === 'string' ? decompressed : new TextDecoder().decode(decompressed))
        
        if (animationRef.current) {
          animationRef.current.destroy()
        }
        
        animationRef.current = lottie.loadAnimation({
          container: containerRef.current!,
          renderer: 'svg',
          loop,
          autoplay,
          animationData,
        })
      } catch (error) {
        console.error('Error loading TGS:', error)
      }
    }

    loadTgs()

    return () => {
      if (animationRef.current) {
        animationRef.current.destroy()
      }
    }
  }, [src, loop, autoplay])

  return (
    <div 
      ref={containerRef}
      className={className}
      style={{ width, height }}
    />
  )
}

