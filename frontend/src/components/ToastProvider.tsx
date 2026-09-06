'use client'

import { createContext, ReactNode } from 'react'
import { useToast } from '@/hooks/useToast'
import ToastContainer from './ToastContainer'

export const ToastContext = createContext<ReturnType<typeof useToast> | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useToast()

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}
