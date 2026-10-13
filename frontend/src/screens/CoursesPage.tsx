'use client'

import { useEffect, useState } from 'react'
import ProtoTopBar from '@/components/ProtoTopBar'
import BottomNav from '@/components/BottomNav'
import CourseCard from '@/components/CourseCard'
import { Course } from '@/models/Api'
import { api } from '@/utils/api'
import styles from './CoursesPage.module.css'

/** Все курсы платформы — раздел «Курсы» в навигации */
export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[] | null>(null)

  useEffect(() => {
    api
      .get<Course[]>('/courses')
      .then((response) => setCourses(response.data))
      .catch(() => setCourses([]))
  }, [])

  return (
    <div className={`${styles.container} protoPage`}>
      <ProtoTopBar />

      <div className={styles.content}>
        <h1 className={styles.title}>Курсы</h1>

        {courses === null ? (
          <div className="bigLoader" />
        ) : courses.length === 0 ? (
          <p className={styles.empty}>Курсов пока нет</p>
        ) : (
          <div className={styles.list}>
            {courses.map((course, index) => (
              <div key={course.id} className={styles.item}>
                <CourseCard course={course} index={index} />
                {course.Institution && (
                  <p className={styles.venue}>
                    {course.Institution.name} · {course.Institution.address}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
