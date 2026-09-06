'use client'

import { useRouter } from 'next/navigation'
import ImageWithFallback from './ImageWithFallback'
import styles from './ActionCards.module.css'

/**
 * Пара карточек-действий под поиском: аренда компьютера и оборудования.
 * Заголовки набраны Advaken Sans Expanded — как в макете.
 */
export default function ActionCards() {
  const router = useRouter()

  return (
    <div className={styles.cards}>
      <div
        className={`${styles.card} protoSurfacePurple`}
        onClick={() => router.push('/equipment?type=Компьютеры')}
      >
        <div className={`${styles.fill} protoGlowTile`} />
        <ImageWithFallback
          src="/prototype/rent-computer.png"
          alt="Арендовать компьютер"
          className={styles.image}
          bare
        />
        <p className={styles.title}>Арендовать компьютер</p>
      </div>

      <div className={`${styles.card} protoSurfaceBlue`} onClick={() => router.push('/equipment')}>
        <div className={`${styles.fill} protoGlowTile`} />
        <ImageWithFallback
          src="/prototype/use-equipment.png"
          alt="Использовать оборудование"
          className={`${styles.image} ${styles.imageBlue}`}
          bare
        />
        <p className={styles.title}>Использовать оборудование</p>
      </div>
    </div>
  )
}
