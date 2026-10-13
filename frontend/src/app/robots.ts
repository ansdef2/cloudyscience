import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/utils/site'

/** Личные разделы и служебные страницы поисковикам не нужны */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/profile',
        '/settings',
        '/notifications',
        '/chats',
        '/teams',
        '/booking',
        '/login',
        '/register',
        '/forgot',
        '/reset',
        '/consent',
        '/api/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
