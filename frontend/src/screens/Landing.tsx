'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'
import ImageWithFallback from '@/components/ImageWithFallback'
import { useAuth } from '@/hooks/useAuth'
import { Course } from '@/models/Api'
import { getEquipmentList } from '@/services/equipmentService'
import { getInstitutions } from '@/services/institutionService'
import { api } from '@/utils/api'
import { pluralize } from '@/utils/format'
import { APP_HOME } from '@/utils/navigation'
import { COMPANY } from '@/utils/legal'
import styles from './Landing.module.css'

interface Stats {
  institutions: number
  equipment: number
  course: Course | null
}

const FEATURES = [
  {
    glow: 'var(--proto-glow-purple)',
    title: 'Карта с кластерами',
    text:
      'Учреждения на Большой Московской и всё, что в них есть. Нажмите на кластер — откроется список оборудования и курсов в этом здании.',
  },
  {
    glow: 'var(--proto-glow-blue)',
    title: 'Оборудование в 3D',
    text:
      'Характеристики каждого принтера, сканера и VR-шлема, фотографии и 3D-модели прямо в браузере. Бронь — на удобные дату и время.',
  },
  {
    glow: 'var(--proto-glow-green)',
    title: 'Курс с прогрессом',
    text:
      'Модули разбиты на этапы с теорией. После записи на курс вы отмечаете пройденное, а прогресс сохраняется в аккаунте.',
  },
  {
    glow: 'var(--proto-glow-lime)',
    title: 'Готово к IoT',
    text:
      'Устройства подключаются через OctoEverywhere или Zenoh: статус печати и телеметрия — прямо в карточке оборудования.',
  },
]

const STEPS = [
  { title: 'Найдите', text: 'на карте, в поиске или по специалисту' },
  { title: 'Запишитесь', text: 'на курс или забронируйте станок' },
  { title: 'Учитесь', text: 'и отмечайте пройденные этапы' },
]

/**
 * Лендинг: что такое «Облако науки» и вход. Само приложение — на /home,
 * туда же ведёт «Открыть карту» без входа.
 */
export default function Landing() {
  const { isAuthenticated, loading } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)

  // Цифры живые, из того же API, что и приложение, — не обещаем лишнего
  useEffect(() => {
    Promise.all([
      getInstitutions(),
      getEquipmentList(),
      api.get<Course[]>('/courses').catch(() => ({ data: [] as Course[] })),
    ]).then(([institutions, equipment, courses]) =>
      setStats({
        institutions: institutions.length,
        equipment: equipment.length,
        course: courses.data[0] ?? null,
      })
    )
  }, [])

  const course = stats?.course ?? null
  const primaryHref = isAuthenticated ? APP_HOME : '/login'
  const primaryLabel = isAuthenticated ? 'Открыть приложение' : 'Войти'

  return (
    <div className={styles.page}>
      {/* Плашка с логотипом и входом закреплена сверху при прокрутке */}
      <header className={styles.navBar}>
        <div className={styles.nav}>
          <BrandLogo height={28} className={styles.logo} />
          <Link
            href={primaryHref}
            className={`${styles.navButton} ${loading ? styles.pending : ''}`}
            aria-busy={loading}
          >
            {primaryLabel}
          </Link>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1 className={`${styles.heroTitle} protoBrandText`}>
              Оборудование и курсы технопарков — в одном окне
            </h1>
            <p className={styles.heroLead}>
              «Облако науки» показывает на карте учреждения дополнительного образования, их
              3D-принтеры, сканеры и VR-шлемы, помогает записаться на курс и не потерять прогресс.
            </p>

            <div className={styles.actions}>
              <Link href={primaryHref} className={styles.primary}>
                {primaryLabel}
              </Link>
            </div>
          </div>

          <div className={styles.heroArt} aria-hidden>
            <div className={`${styles.artCard} ${styles.artPurple} protoSurfacePurple`}>
              <div className={`${styles.artFill} protoGlowTile`} />
              <ImageWithFallback src="/prototype/rent-computer.png" alt="" className={styles.artImage} bare />
              <span className={styles.artTitle}>Арендовать компьютер</span>
            </div>
            <div className={`${styles.artCard} ${styles.artBlue} protoSurfaceBlue`}>
              <div className={`${styles.artFill} protoGlowTile`} />
              <ImageWithFallback src="/prototype/use-equipment.png" alt="" className={styles.artImage} bare />
              <span className={styles.artTitle}>Использовать оборудование</span>
            </div>
          </div>
        </section>

        {stats && (
          <section className={styles.stats} aria-label="Платформа в цифрах">
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.institutions}</span>
              <span className={styles.statLabel}>
                {pluralize(stats.institutions, ['учреждение', 'учреждения', 'учреждений'])} на карте
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.equipment}</span>
              <span className={styles.statLabel}>
                {pluralize(stats.equipment, ['единица', 'единицы', 'единиц'])} оборудования
              </span>
            </div>
            {course && (
              <div className={styles.stat}>
                <span className={styles.statValue}>
                  {course.availableSpots}
                  <span className={styles.statOf}>/{course.totalSpots}</span>
                </span>
                <span className={styles.statLabel}>свободных мест на курсе</span>
              </div>
            )}
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Что внутри</h2>
          <div className={styles.features}>
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className={styles.feature}
                style={{ ['--glow' as string]: feature.glow }}
              >
                <div className={`${styles.featureGlow} protoGlowSoft`} />
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureText}>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Как это работает</h2>
          <ol className={styles.steps}>
            {STEPS.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <span className={styles.stepText}>
                  <strong>{step.title}</strong> {step.text}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {course && (
          <section className={styles.section}>
            <div className={`${styles.course} protoGlowCard`}>
              <span className={styles.courseLabel}>Набор открыт</span>
              <h2 className={styles.courseTitle}>{course.title}</h2>
              <p className={styles.courseText}>
                {course.totalSpots} мест, одна запись на человека. Каждый ведёт собственный IT-проект —
                от идеи до работающего решения.
              </p>
              <Link href={`/course/${course.id}`} className={styles.courseLink}>
                Подробнее о курсе
              </Link>
            </div>
          </section>
        )}

        {!isAuthenticated && (
          <section className={`${styles.section} ${styles.final}`}>
            <h2 className={styles.finalTitle}>Войдите, чтобы записываться и сохранять прогресс</h2>
            <p className={styles.finalText}>
              Браузер предложит сохранить пароль — в следующий раз вход займёт одно касание.
            </p>
            <div className={styles.actions}>
              <Link href="/login" className={styles.primary}>
                Войти
              </Link>
              <Link href="/register" className={styles.secondary}>
                Создать аккаунт
              </Link>
            </div>
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerStart}>
          <span>
            © {new Date().getFullYear()} Облако науки
            {process.env.NEXT_PUBLIC_APP_VERSION && ` · версия ${process.env.NEXT_PUBLIC_APP_VERSION}`}
          </span>
          <nav className={styles.docs} aria-label="Документы">
            <Link href="/privacy">Политика конфиденциальности</Link>
            <Link href="/terms">Пользовательское соглашение</Link>
          </nav>
        </div>
        <div className={styles.legal}>
          <span>{COMPANY.name}</span>
          {COMPANY.ogrn && <span>ОГРН {COMPANY.ogrn}</span>}
          {COMPANY.inn && <span>ИНН {COMPANY.inn}</span>}
          {COMPANY.email && <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>}
        </div>
      </footer>
    </div>
  )
}
