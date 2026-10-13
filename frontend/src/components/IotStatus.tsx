'use client'

import { useEffect, useState } from 'react'
import { getEquipmentChannels, IotChannel } from '@/services/iotService'
import styles from './IotStatus.module.css'

/** Без сигнала дольше этого — устройство считаем не на связи */
const ONLINE_WINDOW_MS = 10 * 60 * 1000
const REFRESH_MS = 30 * 1000

const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

/**
 * Статус устройства из IoT-каналов. Пока у оборудования нет включённых
 * каналов, блок не показывается вовсе.
 */
export default function IotStatus({ equipmentId }: { equipmentId: string }) {
  const [channels, setChannels] = useState<IotChannel[]>([])

  useEffect(() => {
    let cancelled = false
    const load = () =>
      getEquipmentChannels(equipmentId).then((items) => {
        if (!cancelled) setChannels(items)
      })

    load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [equipmentId])

  if (channels.length === 0) return null

  return (
    <section className={styles.root} aria-label="Состояние устройства">
      {channels.map((channel) => {
        const online =
          channel.lastSeenAt != null &&
          Date.now() - new Date(channel.lastSeenAt).getTime() < ONLINE_WINDOW_MS
        const reading = channel.lastReading
        const progress = reading?.progress

        return (
          <div key={channel.id} className={styles.channel}>
            <div className={styles.head}>
              <span className={`${styles.dot} ${online ? styles.online : ''}`} aria-hidden />
              <span className={styles.name}>{channel.name}</span>
              <span className={styles.provider}>{channel.providerTitle}</span>
            </div>

            <p className={styles.state}>
              {reading?.state ?? (online ? 'на связи' : 'нет данных')}
              {reading?.job && <span className={styles.job}> · {reading.job}</span>}
            </p>

            {progress != null && (
              <div
                className={styles.track}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <div className={styles.fill} style={{ width: `${progress}%` }} />
              </div>
            )}

            <div className={styles.foot}>
              <span>
                {channel.lastSeenAt ? `Сигнал ${timeAgo(channel.lastSeenAt)}` : 'Сигнала ещё не было'}
              </span>
              {channel.link && (
                <a className={styles.link} href={channel.link} target="_blank" rel="noopener noreferrer">
                  Открыть устройство
                </a>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}
