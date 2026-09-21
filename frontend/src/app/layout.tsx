import type { Metadata } from 'next'
import { Onest, Playfair_Display } from 'next/font/google'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/ToastProvider'
import '@/styles/globals.css'

const onest = Onest({ subsets: ['latin', 'cyrillic'], variable: '--font-onest' })
const playfair = Playfair_Display({ subsets: ['latin', 'cyrillic'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Облако науки',
  description: 'Оборудование и курсы образовательных учреждений: каталог, запись и бронирование',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={`${onest.variable} ${playfair.variable}`}>
      <body>
        <ErrorBoundary>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
