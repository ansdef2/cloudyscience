/** Пропорции файла public/brand/logo.webp (2000×531) */
const LOGO_RATIO = 2000 / 531

interface BrandLogoProps {
  height?: number
  className?: string
}

/**
 * Логотип «Облако науки»: знак и надпись, белые на прозрачном фоне —
 * рассчитан на тёмные экраны прототипа. Ширина и высота заданы заранее,
 * чтобы шапка не прыгала, пока картинка грузится.
 */
export default function BrandLogo({ height = 28, className }: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo.webp"
      alt="Облако науки"
      width={Math.round(height * LOGO_RATIO)}
      height={height}
      className={className}
    />
  )
}
