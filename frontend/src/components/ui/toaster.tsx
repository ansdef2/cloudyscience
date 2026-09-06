'use client'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/utils'

export function Toaster() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'px-4 py-3 rounded-lg text-white text-sm shadow-lg cursor-pointer',
            {
              'bg-green-600': toast.type === 'success',
              'bg-red-600': toast.type === 'error',
              'bg-blue-600': toast.type === 'info',
              'bg-yellow-600': toast.type === 'warning',
            }
          )}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}