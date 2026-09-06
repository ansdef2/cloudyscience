import { Onest as OnestFont, Playfair_Display } from 'next/font/google'
import localFont from 'next/font/local'

// Onest - шрифт без засечек (подключен через Google Fonts)
export const Onest = OnestFont({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-onest',
  display: 'swap',
})

// Playfair Display - бесплатная альтернатива CalvinoDisplayItalic (с засечками, italic)
// Используется как fallback, если локальный CalvinoDisplayItalic не найден
const PlayfairDisplay = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  style: ['italic'],
  variable: '--font-playfair',
  display: 'swap',
})

export const Calvino = PlayfairDisplay
