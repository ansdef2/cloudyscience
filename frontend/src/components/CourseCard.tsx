'use client'

import { useRouter } from 'next/navigation'
import { Course } from '@/models/Api'
import { pluralize } from '@/utils/format'
import styles from './CourseCard.module.css'

/**
 * Карточка курса в карусели «Свободные места на курсы».
 * Цвет свечения задаётся снаружи: в макете карточки в ленте разноцветные.
 */
const GLOW_BY_INDEX = [
  'var(--proto-glow-green)',
  'var(--proto-glow-blue)',
  'var(--proto-glow-lime)',
  'var(--proto-glow-purple)',
]

interface CourseCardProps {
  course: Course
  index?: number
}

export default function CourseCard({ course, index = 0 }: CourseCardProps) {
  const router = useRouter()
  const spots = course.spotsLeft ?? course.availableSpots ?? 0

  return (
    <div
      className={styles.card}
      style={{ ['--glow' as string]: GLOW_BY_INDEX[index % GLOW_BY_INDEX.length] }}
      onClick={() => router.push(`/course/${course.id}`)}
    >
      <div className={`${styles.fill} protoGlowCard`} />

      <div className={styles.content}>
        <p className={styles.title}>{course.title}</p>
        <div className={styles.meta}>
          <span>{course.direction}</span>
          <span className={styles.dot} />
          <span>
            {spots} {pluralize(spots, ['место', 'места', 'мест'])}
          </span>
        </div>
      </div>

      <button
        className={`${styles.action} protoPill`}
        onClick={(event) => {
          event.stopPropagation()
          router.push(`/course/${course.id}`)
        }}
      >
        Записаться
      </button>
    </div>
  )
}
