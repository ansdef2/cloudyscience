/** @type {import('next').NextConfig} */

/**
 * Заголовки безопасности для всех страниц. CSP не задаём строгой:
 * карта грузит тайлы и шрифты с внешних серверов, а Метрика — свой скрипт.
 * frame-ancestors запрещает встраивать сайт в чужие страницы (кликджекинг).
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    domains: ['localhost'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig
