'use client'

import styles from './LoadingScreen.module.css'

export default function LoadingScreen() {
  return (
    <div className={styles.container}>
      <div className={styles.logoText}>
        <span className={styles.wordFirst}>Облако</span>
        <span className={styles.wordSecond}>науки</span>
      </div>
      <div className={styles.loader}></div>
    </div>
  )
}
