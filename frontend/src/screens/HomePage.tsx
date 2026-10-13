'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'
import MapWindow, { MapPlace } from '@/components/map/MapWindow'
import ProfileMenu from '@/components/ProfileMenu'
import ActionCards from '@/components/ActionCards'
import CourseCard from '@/components/CourseCard'
import HighlightCard from '@/components/HighlightCard'
import PostCard from '@/components/PostCard'
import FeedFilters from '@/components/FeedFilters'
import { Course, Institution } from '@/models/Api'
import { Equipment } from '@/models/Equipment'
import { getInstitutions } from '@/services/institutionService'
import { getEquipmentList } from '@/services/equipmentService'
import { getPosts, Post, PostSort } from '@/services/postService'
import { api } from '@/utils/api'
import { pluralize } from '@/utils/format'
import styles from './HomePage.module.css'

export default function HomePage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [highlights, setHighlights] = useState<Post[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [sort, setSort] = useState<PostSort>('popular')

  // Курсы, «Актуальное» и точки карты грузятся один раз
  useEffect(() => {
    const load = async () => {
      const [coursesResponse, featured, institutionList, equipmentList] = await Promise.all([
        api.get<Course[]>('/courses').catch(() => ({ data: [] as Course[] })),
        getPosts({ featured: true }),
        getInstitutions(),
        getEquipmentList(),
      ])

      setAllCourses(coursesResponse.data)
      setCourses(coursesResponse.data.filter((course) => (course.availableSpots ?? 0) > 0))
      setHighlights(featured)
      setInstitutions(institutionList)
      setEquipment(equipmentList)
    }

    load()
  }, [])

  // Кластеры карты: учреждение с координатами и всё, что в нём можно взять или пройти
  const places = useMemo<MapPlace[]>(
    () =>
      institutions
        .filter((institution) => institution.latitude != null && institution.longitude != null)
        .map((institution) => ({
          id: institution.id,
          name: institution.name,
          address: institution.address,
          latitude: institution.latitude!,
          longitude: institution.longitude!,
          href: `/institution/${institution.id}`,
          items: [
            ...allCourses
              .filter((course) => course.institutionId === institution.id)
              .map((course) => ({
                id: course.id,
                kind: 'course' as const,
                title: course.title,
                caption: `${course.availableSpots} ${pluralize(course.availableSpots, [
                  'свободное место',
                  'свободных места',
                  'свободных мест',
                ])}`,
                href: `/course/${course.id}`,
              })),
            ...equipment
              .filter((item) => item.institutionId === institution.id)
              .map((item) => ({
                id: item.id,
                kind: 'equipment' as const,
                title: item.name,
                caption: [
                  item.type !== item.name ? item.type : null,
                  item.status === 'open' ? 'открыто' : 'закрыто',
                ]
                  .filter(Boolean)
                  .join(' · '),
                href: `/equipment/${item.id}`,
              })),
          ],
        })),
    [institutions, allCourses, equipment]
  )

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
      <header className={styles.topBar}>
        <BrandLogo height={26} className={styles.logo} />
        <ProfileMenu />
      </header>

      <div className={styles.content}>
        <MapWindow places={places} />

        <button className={styles.search} onClick={() => router.push('/search')}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none" aria-hidden>
            <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="m14 14 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Поиск
        </button>

        <div style={{ marginTop: 21 }}>
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
