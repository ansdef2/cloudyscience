import Link from 'next/link'
import { APP_HOME } from '@/utils/navigation'
import styles from './not-found.module.css'

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={`${styles.title} protoBrandText`}>404</h1>
        <h2 className={styles.subtitle}>Страница не найдена</h2>
        <p className={styles.description}>
          Извините, запрашиваемая страница не существует.
        </p>
        <Link href={APP_HOME} className={styles.button}>
          Вернуться на главную
        </Link>
      </div>
    </div>
  )
}
