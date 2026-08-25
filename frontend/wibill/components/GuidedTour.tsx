'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { tourSteps, TourStep } from '@/lib/tour-steps'

const TOUR_KEY = 'wb_tour_completed'
const TOUR_VERSION = '1.0'

export function shouldShowTour(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const completed = localStorage.getItem(TOUR_KEY)
    if (!completed) return true
    const data = JSON.parse(completed)
    return data.version !== TOUR_VERSION
  } catch {
    return true
  }
}

export function markTourComplete() {
  localStorage.setItem(TOUR_KEY, JSON.stringify({ version: TOUR_VERSION, completedAt: Date.now() }))
}

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

export default function GuidedTour({ forceShow = false, onFinish }: { forceShow?: boolean; onFinish?: () => void }) {
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: string }>({ top: 0, left: 0, placement: 'bottom' })
  const overlayRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const currentStep: TourStep | undefined = tourSteps[stepIndex]
  const isLast = stepIndex === tourSteps.length - 1
  const isFirst = stepIndex === 0

  const updatePosition = useCallback(() => {
    if (!currentStep?.selector) {
      setSpotlight(null)
      setTooltipPos({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 180, placement: 'bottom' })
      return
    }
    const el = document.querySelector(currentStep.selector) as HTMLElement | null
    if (!el) {
      setSpotlight(null)
      setTooltipPos({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 180, placement: 'bottom' })
      return
    }
    const rect = el.getBoundingClientRect()
    const pad = 8
    setSpotlight({
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    })

    const placement = currentStep.position || 'right'
    const gap = 16
    let top = 0
    let left = 0

    if (placement === 'right') {
      top = rect.top + rect.height / 2 - 60
      left = rect.right + gap
    } else if (placement === 'left') {
      top = rect.top + rect.height / 2 - 60
      left = rect.left - gap - 360
    } else if (placement === 'bottom') {
      top = rect.bottom + gap
      left = rect.left + rect.width / 2 - 180
    } else {
      top = rect.top - gap - 160
      left = rect.left + rect.width / 2 - 180
    }

    top = Math.max(16, Math.min(top, window.innerHeight - 180))
    left = Math.max(16, Math.min(left, window.innerWidth - 380))

    setTooltipPos({ top, left, placement })
  }, [currentStep])

  const startTour = useCallback(() => {
    setStepIndex(0)
    setActive(true)
  }, [])

  useEffect(() => {
    if (forceShow) startTour()
  }, [forceShow, startTour])

  useEffect(() => {
    if (!active) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [active, stepIndex, updatePosition])

  useEffect(() => {
    if (!active) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setActive(false); markTourComplete() }
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [active, stepIndex])

  const goNext = () => {
    if (isLast) {
      setActive(false)
      markTourComplete()
      onFinish?.()
    } else {
      setStepIndex(i => i + 1)
    }
  }

  const goPrev = () => {
    if (!isFirst) setStepIndex(i => i - 1)
  }

  const skip = () => {
    setActive(false)
    markTourComplete()
    onFinish?.()
  }

  const restart = () => {
    localStorage.removeItem(TOUR_KEY)
    setStepIndex(0)
    setActive(true)
  }

  if (!active) {
    return (
      <button
        onClick={startTour}
        className="sidebar-support-btn"
        style={{
          display: 'none',
        }}
      />
    )
  }

  const pillBg = 'rgba(232,184,75,0.12)'
  const pillBorder = 'rgba(232,184,75,0.25)'

  return (
    <>
      <style>{`
        @keyframes tourFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tourPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(232,184,75,0.4); } 50% { box-shadow: 0 0 0 6px rgba(232,184,75,0); } }
      `}</style>

      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current) skip() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      {/* Spotlight cutout */}
      {spotlight && (
        <div style={{
          position: 'fixed',
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
          borderRadius: 10,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.65), 0 0 16px 2px rgba(232,184,75,0.3)',
          zIndex: 99999,
          pointerEvents: 'none',
          transition: 'all 0.35s cubic-bezier(0.19, 1, 0.22, 1)',
          animation: 'tourPulse 2s ease-in-out infinite',
        }} />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: 360,
          zIndex: 100000,
          background: '#0D0D0B',
          border: '0.5px solid #2A2A27',
          borderRadius: 14,
          padding: 0,
          fontFamily: 'Inter, sans-serif',
          animation: 'tourFadeIn 0.3s ease-out',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: pillBg, border: `0.5px solid ${pillBorder}`,
              borderRadius: 6, padding: '3px 8px',
              fontSize: 10, fontWeight: 700, color: '#E8B84B',
              fontFamily: "'DM Mono', monospace",
              letterSpacing: '0.05em',
            }}>
              {stepIndex + 1} / {tourSteps.length}
            </span>
            {currentStep?.section && (
              <span style={{
                fontSize: 10, color: '#6B6964', textTransform: 'uppercase',
                letterSpacing: '0.08em', fontWeight: 600,
              }}>
                {currentStep.section}
              </span>
            )}
          </div>
          <button
            onClick={skip}
            style={{
              width: 26, height: 26, borderRadius: 6,
              background: 'transparent', border: 'none',
              color: '#6B6964', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '12px 16px 16px' }}>
          <h3 style={{
            margin: '0 0 6px', fontSize: 15, fontWeight: 700,
            color: '#EDEBE6', fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {currentStep?.title}
          </h3>
          <p style={{
            margin: 0, fontSize: 12, lineHeight: 1.6, color: '#8C8A84',
          }}>
            {currentStep?.description}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px 14px', gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {!isFirst && (
              <button
                onClick={goPrev}
                style={{
                  height: 32, padding: '0 12px', borderRadius: 8,
                  background: 'transparent', border: '0.5px solid #2A2A27',
                  color: '#8C8A84', cursor: 'pointer', fontSize: 12,
                  fontFamily: 'Inter, sans-serif', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <ChevronLeft size={12} /> Back
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={skip}
              style={{
                height: 32, padding: '0 12px', borderRadius: 8,
                background: 'transparent', border: 'none',
                color: '#6B6964', cursor: 'pointer', fontSize: 12,
                fontFamily: 'Inter, sans-serif', fontWeight: 500,
              }}
            >
              Skip tour
            </button>
            <button
              onClick={goNext}
              style={{
                height: 32, padding: '0 16px', borderRadius: 8,
                background: '#E8B84B', border: 'none',
                color: '#3D2A06', cursor: 'pointer', fontSize: 12,
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 4,
                transition: 'all 0.15s',
              }}
            >
              {isLast ? 'Finish' : 'Next'} {!isLast && <ChevronRight size={12} />}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 2, background: '#141414', width: '100%' }}>
          <div style={{
            height: '100%', background: '#E8B84B',
            width: `${((stepIndex + 1) / tourSteps.length) * 100}%`,
            transition: 'width 0.35s cubic-bezier(0.19, 1, 0.22, 1)',
            borderRadius: '0 2px 2px 0',
          }} />
        </div>
      </div>
    </>
  )
}

export function TourRestartButton() {
  const [clicked, setClicked] = useState(false)

  const handleRestart = () => {
    localStorage.removeItem(TOUR_KEY)
    setClicked(true)
    setTimeout(() => window.location.reload(), 100)
  }

  if (clicked) return null

  return (
    <button
      onClick={handleRestart}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 8,
        background: '#111110', border: '0.5px solid #2A2A27',
        color: '#8C8A84', cursor: 'pointer', fontSize: 12,
        fontFamily: 'Inter, sans-serif', fontWeight: 500,
        transition: 'all 0.15s',
      }}
    >
      <RotateCcw size={13} /> Replay tour
    </button>
  )
}
