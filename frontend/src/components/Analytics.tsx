'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import styles from './AccountNotice.module.css'

const YM_ID = process.env.NEXT_PUBLIC_YM_ID
const NOTICE_KEY = 'cookie-notice-seen'

declare global {
  interface Window {
    ym?: (id: number, method: string, ...args: unknown[]) => void
  }
}

/**
 * Яндекс Метрика — только если задан номер счётчика (NEXT_PUBLIC_YM_ID).
 * Счётчик собирает обезличенную статистику; о cookies предупреждаем один раз.
 */
export default function Analytics() {
  const pathname = usePathname()
  const [showNotice, setShowNotice] = useState(false)

  useEffect(() => {
    if (!YM_ID) return
    try {
      setShowNotice(!localStorage.getItem(NOTICE_KEY))
    } catch {
      setShowNotice(true)
    }
  }, [])

  // Переходы внутри приложения — без перезагрузки, поэтому просмотр отмечаем сами
  useEffect(() => {
    if (YM_ID && window.ym) window.ym(Number(YM_ID), 'hit', window.location.href)
  }, [pathname])

  if (!YM_ID) return null

  const dismiss = () => {
    try {
      localStorage.setItem(NOTICE_KEY, '1')
    } catch {
      // Приватный режим — покажем ещё раз в следующий визит
    }
    setShowNotice(false)
  }

  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
ym(${Number(YM_ID)},"init",{defer:true,clickmap:true,trackLinks:true,accurateTrackBounce:true});`}
      </Script>
      {showNotice && (
        <div className={styles.notice} role="status">
          <p className={styles.text}>
            Мы используем cookies и Яндекс Метрику для обезличенной статистики посещений. Подробнее — в{' '}
            <Link href="/privacy" className={styles.link}>
              политике конфиденциальности
            </Link>
            .
          </p>
          <button className={styles.button} onClick={dismiss}>
            Понятно
          </button>
        </div>
      )}
    </>
  )
}
