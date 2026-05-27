'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Toast, ToastContainer, ToastType } from '@/components/ui/Toast'

interface ToastMessage {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: ToastMessage[]
  showToast: (
    title: string,
    options?: {
      type?: ToastType
      message?: string
      duration?: number
      action?: { label: string; onClick: () => void }
    }
  ) => string
  removeToast: (id: string) => void
  clearAll: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback(
    (
      title: string,
      options: {
        type?: ToastType
        message?: string
        duration?: number
        action?: { label: string; onClick: () => void }
      } = {}
    ) => {
      const id = Math.random().toString(36).substring(7)
      const newToast: ToastMessage = {
        id,
        type: options.type || 'info',
        title,
        message: options.message,
        duration: options.duration !== undefined ? options.duration : 5000,
        action: options.action,
      }

      setToasts(prev => [...prev, newToast])

      // Auto-remove if duration is set
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, newToast.duration)
      }

      return id
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, clearAll }}>
      {children}
      <ToastContainer
        toasts={toasts.map(t => ({
          ...t,
          onClose: removeToast,
        }))}
        onClose={removeToast}
      />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

// Convenience helpers
export function useToastSuccess(title: string, message?: string, duration = 3000) {
  const { showToast } = useToast()
  return useCallback(
    () => showToast(title, { type: 'success', message, duration }),
    [showToast, title, message, duration]
  )
}

export function useToastError(title: string, message?: string, duration = 5000) {
  const { showToast } = useToast()
  return useCallback(
    () => showToast(title, { type: 'error', message, duration }),
    [showToast, title, message, duration]
  )
}