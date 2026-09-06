'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageWithFallback from '@/components/ImageWithFallback'
import ActionCards from '@/components/ActionCards'
import CourseCard from '@/components/CourseCard'
import HighlightCard from '@/components/HighlightCard'
import PostCard from '@/components/PostCard'
import FeedFilters from '@/components/FeedFilters'
import { Course, Institution } from '@/models/Api'
import { getInstitutions } from '@/services/institutionService'
import { getPosts, Post, PostSort } from '@/services/postService'
import { api } from '@/utils/api'
import styles from './HomePage.module.css'

export default function HomePage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [highlights, setHighlights] = useState<Post[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [sort, setSort] = useState<PostSort>('popular')

  // Курсы, «Актуальное» и метка на карте грузятся один раз
  useEffect(() => {
    const load = async () => {
      const [coursesResponse, featured, institutions] = await Promise.all([
        api.get<Course[]>('/courses').catch(() => ({ data: [] as Course[] })),
        getPosts({ featured: true }),
        getInstitutions(),
      ])

      setCourses(coursesResponse.data.filter((course) => (course.availableSpots ?? 0) > 0))
      setHighlights(featured)
      setInstitution(institutions[0] ?? null)
    }

    load()
  }, [])

  // Лента перезапрашивается при смене сортировки
  useEffect(() => {
    let cancelled = false

    getPosts({ featured: false, sort }).then((items) => {
      if (!cancelled) setPosts(items)
    })

    return () => {
      cancelled = true
    }
  }, [sort])

  return (
    <div className={styles.container}>
      <ImageWithFallback
        src="/prototype/map.png"
        alt="Карта"
        className={styles.map}
        bare
      />

      <header className={styles.topBar}>
        <span className={styles.logo}>Облако науки</span>
        <div className={styles.topActions}>
          <button className={styles.iconButton} aria-label="Уведомления">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <ImageWithFallback
            src="/prototype/profile.jpg"
            alt="Профиль"
            className={styles.avatar}
            bare
          />
        </div>
      </header>

      {institution && (
        <div className={styles.mapPin}>
          <div className={styles.mapPinCard}>
            <div>
              <div className={styles.mapPinTitle}>{institution.name}</div>
              <div className={styles.mapPinAddress}>{institution.address}</div>
            </div>
          </div>
          <span className={styles.mapPinDot} />
        </div>
      )}

      <div className={styles.sheet}>
        <div className={styles.handle} />

        <button className={styles.search} onClick={() => router.push('/search')}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none" aria-hidden>
            <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="m14 14 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Поиск
        </button>

        <div style={{ marginTop: 20 }}>
          <ActionCards />
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Свободные места на курсы</h2>
            <button
              className={styles.sectionAction}
              aria-label="Все курсы"
              onClick={() => router.push('/search?type=services')}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="m9 6 6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className={styles.carousel}>
            {courses.length > 0 ? (
              courses.map((course, index) => (
                <CourseCard key={course.id} course={course} index={index} />
              ))
            ) : (
              <p className={styles.empty}>Свободных мест сейчас нет</p>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Актуальное</h2>
          </div>

          <div className={styles.carousel}>
            {highlights.map((post) => (
              <HighlightCard key={post.id} post={post} />
            ))}
          </div>
        </section>

        <section className={styles.feed}>
          <div className={styles.feedFilters}>
            <FeedFilters sort={sort} onSortChange={setSort} />
          </div>

          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </section>
      </div>
    </div>
  )
}
