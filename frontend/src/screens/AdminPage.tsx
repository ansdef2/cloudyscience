'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import AuthGate from '@/components/AuthGate'
import {
  CONSULTATION_STATUS,
  Consultation,
  ConsultationStatus,
  getConsultations,
  setConsultationStatus,
} from '@/services/peopleService'
import { useToast } from '@/hooks/useToast'
import { api, ApiError } from '@/utils/api'
import { BOOKING_STATUS, pluralize } from '@/utils/format'
import ui from '@/styles/ui.module.css'
import styles from './AdminPage.module.css'

type Tab = 'enrollments' | 'bookings' | 'consultations'

interface Enrollment {
  id: string
  userId: string
  courseId: string
  createdAt: string
  User?: { id: string; name: string; email: string }
  Course?: { id: string; title: string; totalSpots: number; availableSpots: number }
}

interface AdminBooking {
  id: string
  date: string
  time: string
  rentalType: 'remote' | 'in-person'
  status: string
  notes?: string
  createdAt: string
  Equipment?: { id: string; name: string }
  User?: { id: string; name: string; email: string }
  Team?: { id: string; name: string } | null
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'enrollments', label: 'Записи на курс' },
  { id: 'bookings', label: 'Брони' },
  { id: 'consultations', label: 'Консультации' },
]

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

/** Админка: кто записан на курсы, кто взял оборудование, кто ждёт консультации */
export default function AdminPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initial = (searchParams.get('tab') as Tab) || 'enrollments'
  const [tab, setTab] = useState<Tab>(TABS.some((item) => item.id === initial) ? initial : 'enrollments')

  const switchTab = (next: Tab) => {
    setTab(next)
    router.replace(`/admin?tab=${next}`, { scroll: false })
  }

  return (
    <div className={`${ui.page} protoPage`}>
      <ProtoTopBar />

      <div className={ui.content}>
        <h1 className={ui.title}>Админка</h1>
        <AuthGate reason="Войдите под учётной записью администратора" adminOnly>
          {() => (
            <>
              <div className={`${ui.tabs} ${styles.tabs}`} role="tablist">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    role="tab"
                    aria-selected={tab === item.id}
                    className={`${ui.tab} ${tab === item.id ? ui.tabActive : ''}`}
                    onClick={() => switchTab(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {tab === 'enrollments' && <Enrollments />}
              {tab === 'bookings' && <Bookings />}
              {tab === 'consultations' && <Consultations />}
            </>
          )}
        </AuthGate>
      </div>
    </div>
  )
}

function Enrollments() {
  const toast = useToast()
  const [items, setItems] = useState<Enrollment[] | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(
    () =>
      api
        .get<Enrollment[]>('/admin/enrollments')
        .then((response) => setItems(response.data))
        .catch(() => setItems([])),
    []
  )

  useEffect(() => {
    load()
  }, [load])

  // По курсам: у каждого — счётчик мест и список записавшихся
  const byCourse = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const groups = new Map<string, { course: Enrollment['Course']; rows: Enrollment[] }>()
    for (const item of items ?? []) {
      const haystack = `${item.User?.name} ${item.User?.email}`.toLowerCase()
      if (needle && !haystack.includes(needle)) continue
      const group = groups.get(item.courseId) ?? { course: item.Course, rows: [] }
      group.rows.push(item)
      groups.set(item.courseId, group)
    }
    return Array.from(groups.values())
  }, [items, query])

  const unenroll = async (item: Enrollment) => {
    if (!window.confirm(`Снять ${item.User?.name} с курса? Место освободится.`)) return
    try {
      await api.delete(`/courses/${item.courseId}/enrollments/${item.userId}`)
      toast.success('Запись снята, место освободилось')
      load()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось снять с курса')
    }
  }

  if (items === null) return <div className="bigLoader" />

  return (
    <>
      <input
        className={ui.input}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Поиск по имени или почте"
        aria-label="Поиск по записям"
      />

      {byCourse.length === 0 ? (
        <div className={ui.empty}>{items.length ? 'Никого не нашлось' : 'На курсы пока никто не записался'}</div>
      ) : (
        byCourse.map(({ course, rows }) => (
          <section key={course?.id} className={styles.group}>
            <div className={styles.groupHead}>
              <h2 className={ui.sectionTitle}>{course?.title}</h2>
              {course && (
                <span className={`${ui.badge} ${ui.badgeGreen}`}>
                  занято {course.totalSpots - course.availableSpots} из {course.totalSpots}
                </span>
              )}
            </div>
            <div className={ui.list}>
              {rows.map((item, index) => (
                <div key={item.id} className={`${ui.card} ${styles.row}`}>
                  <span className={styles.index}>{index + 1}</span>
                  <div className={ui.cardBody}>
                    <span className={ui.cardTitle}>{item.User?.name}</span>
                    <a className={`${ui.cardMeta} ${styles.mail}`} href={`mailto:${item.User?.email}`}>
                      {item.User?.email}
                    </a>
                  </div>
                  <span className={styles.date}>{formatDate(item.createdAt)}</span>
                  <button className={`${ui.danger} ${ui.small}`} onClick={() => unenroll(item)}>
                    Снять
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  )
}

function Bookings() {
  const toast = useToast()
  const [items, setItems] = useState<AdminBooking[] | null>(null)
  const [status, setStatus] = useState<string>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    api
      .get<AdminBooking[]>('/bookings')
      .then((response) => setItems(response.data))
      .catch(() => setItems([]))
  }, [])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (items ?? []).filter((item) => {
      if (status !== 'all' && item.status !== status) return false
      if (!needle) return true
      return `${item.User?.name} ${item.User?.email} ${item.Equipment?.name} ${item.Team?.name ?? ''}`
        .toLowerCase()
        .includes(needle)
    })
  }, [items, status, query])

  const changeStatus = async (item: AdminBooking, next: string) => {
    try {
      await api.put(`/bookings/${item.id}`, { status: next })
      setItems((current) => current?.map((row) => (row.id === item.id ? { ...row, status: next } : row)) ?? null)
      toast.success('Статус брони обновлён')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось сменить статус')
    }
  }

  if (items === null) return <div className="bigLoader" />

  return (
    <>
      <div className={styles.filters}>
        <input
          className={ui.input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Человек, оборудование или команда"
          aria-label="Поиск по броням"
        />
        <select
          className={ui.select}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Статус"
        >
          <option value="all">Все статусы</option>
          {Object.entries(BOOKING_STATUS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <p className={ui.muted} style={{ fontSize: 13 }}>
        {visible.length} {pluralize(visible.length, ['бронь', 'брони', 'броней'])}
      </p>

      {visible.length === 0 ? (
        <div className={ui.empty}>{items.length ? 'Ничего не нашлось' : 'Оборудование пока никто не бронировал'}</div>
      ) : (
        <div className={ui.list}>
          {visible.map((item) => (
            <div key={item.id} className={`${ui.card} ${styles.row}`}>
              <div className={ui.cardBody}>
                <span className={ui.cardTitle}>{item.Equipment?.name ?? 'Оборудование удалено'}</span>
                <span className={ui.cardMeta}>
                  {formatDate(item.date)}, {item.time} · {item.rentalType === 'remote' ? 'дистанционно' : 'лично'}
                </span>
                <span className={ui.cardMeta}>
                  {item.User?.name} ·{' '}
                  <a className={styles.mail} href={`mailto:${item.User?.email}`}>
                    {item.User?.email}
                  </a>
                  {item.Team && (
                    <span className={`${ui.badge} ${ui.badgeBlue} ${styles.team}`}>
                      команда «{item.Team.name}»
                    </span>
                  )}
                </span>
              </div>
              <select
                className={`${ui.select} ${styles.status}`}
                value={item.status}
                onChange={(event) => changeStatus(item, event.target.value)}
                aria-label="Статус брони"
              >
                {Object.entries(BOOKING_STATUS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function Consultations() {
  const toast = useToast()
  const [items, setItems] = useState<Consultation[] | null>(null)

  useEffect(() => {
    getConsultations()
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  const changeStatus = async (item: Consultation, next: ConsultationStatus) => {
    try {
      await setConsultationStatus(item.id, next)
      setItems((current) => current?.map((row) => (row.id === item.id ? { ...row, status: next } : row)) ?? null)
      toast.success('Статус заявки обновлён')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось сменить статус')
    }
  }

  if (items === null) return <div className="bigLoader" />
  if (items.length === 0) return <div className={ui.empty}>Заявок на консультации пока нет</div>

  return (
    <div className={ui.list}>
      {items.map((item) => (
        <div key={item.id} className={`${ui.card} ${styles.row} ${styles.consultation}`}>
          <div className={ui.cardBody}>
            <span className={ui.cardTitle}>
              {item.User?.name} → {item.Specialist?.name}
            </span>
            <span className={ui.cardMeta}>
              <a className={styles.mail} href={`mailto:${item.User?.email}`}>
                {item.User?.email}
              </a>
              {' · '}
              {item.preferredDate ? formatDate(item.preferredDate) : 'дата не указана'}
              {item.preferredTime ? `, ${item.preferredTime}` : ''}
            </span>
            {item.message && <p className={styles.message}>{item.message}</p>}
          </div>
          <select
            className={`${ui.select} ${styles.status}`}
            value={item.status}
            onChange={(event) => changeStatus(item, event.target.value as ConsultationStatus)}
            aria-label="Статус заявки"
          >
            {Object.entries(CONSULTATION_STATUS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
