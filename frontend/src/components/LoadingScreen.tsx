'use client'

import styles from './LoadingScreen.module.css'

export default function LoadingScreen() {
  return (
    <div className={styles.container}>
      <div className={styles.logoContainer}>
        <div className={styles.logoIcon}>
          <div className={styles.square1}></div>
          <div className={styles.square2}></div>
        </div>
        <div className={styles.logoText}>
          <span className={styles.cloud}>Cloud</span>
          <span className={styles.co}>.co-</span>
        </div>
      </div>
      <div className={styles.loader}></div>
    </div>
  )
}
