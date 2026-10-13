'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import BottomNav from '@/components/BottomNav'
import Avatar from '@/components/Avatar'
import BookingCard from '@/components/BookingCard'
import AuthGate from '@/components/AuthGate'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { User } from '@/models/Api'
import { Booking, cancelBooking, getUserBookings } from '@/services/bookingService'
import { getUnreadCount } from '@/services/chatService'
import { resendParentConsent } from '@/services/accountService'
import {
  CONSULTATION_STATUS,
  Consultation,
  getConsultations,
  setConsultationStatus,
} from '@/services/peopleService'
import { getMyTeams, Team } from '@/services/teamService'
import { ApiError } from '@/utils/api'
import ui from '@/styles/ui.module.css'
import styles from './ProfilePage.module.css'

/** Профиль — на телефоне это вкладка нижней панели: всё личное в одном месте */
export default function ProfilePage() {
  return (
    <div className={`${ui.page} protoPage`}>
      <ProtoTopBar />
      <div className={ui.content}>
        <AuthGate reason="Войдите, чтобы видеть свои брони, команды и сообщения">
          {(user) => <Profile user={user} />}
        </AuthGate>
      </div>
      <BottomNav />
    </div>
  )
}

function Profile({ user }: { user: User }) {
  const router = useRouter()
  const toast = useToast()
  const { logout } = useAuth()
  const [unread, setUnread] = useState(0)
  const [teams, setTeams] = useState<Team[]>([])
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [consultations, setConsultations] = useState<Consultation[]>([])

  useEffect(() => {
    getUnreadCount().then(setUnread).catch(() => setUnread(0))
    getMyTeams().then(setTeams).catch(() => setTeams([]))
    getUserBookings().then(setBookings).catch(() => setBookings([]))
    getConsultations().then(setConsultations).catch(() => setConsultations([]))
  }, [])

  const cancel = async (booking: Booking) => {
    if (!window.confirm('Отменить бронь?')) return
    try {
      await cancelBooking(booking.id)
      setBookings(
        (current) =>
          current?.map((row) => (row.id === booking.id ? { ...row, status: 'cancelled' } : row)) ?? null
      )
      toast.success('Бронь отменена')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось отменить')
    }
  }

  const cancelConsultation = async (item: Consultation) => {
    try {
      await setConsultationStatus(item.id, 'cancelled')
      setConsultations((current) =>
        current.map((row) => (row.id === item.id ? { ...row, status: 'cancelled' } : row))
      )
      toast.success('Заявка отменена')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось отменить')
    }
  }

  const resendLetter = async () => {
    try {
      const result = await resendParentConsent()
      toast.success(
        result.sent
          ? `Письмо отправлено на ${user.parentEmail}`
          : 'Почта на сайте пока не настроена — согласие подтвердит администратор'
      )
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось отправить письмо')
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  // Отменить можно только свою бронь, и пока она не прошла
  const canCancel = (booking: Booking) =>
    booking.userId === user.id && (booking.status === 'pending' || booking.status === 'confirmed')

  return (
    <div className={styles.layout}>
      <section className={`${ui.panel} ${styles.me}`}>
        <Avatar name={user.name} src={user.avatar} size={64} />
        <div className={ui.cardBody}>
          <h1 className={styles.name}>{user.name}</h1>
          <span className={ui.cardMeta}>{user.email}</span>
          {user.role === 'admin' && (
            <span className={`${ui.badge} ${ui.badgeGreen} ${styles.role}`}>администратор</span>
          )}
        </div>
      </section>

      {user.parentConsentStatus === 'pending' && (
        <section className={`${ui.panel} ${styles.pending}`}>
          <span className={styles.pendingTitle}>Ждём согласия родителя</span>
          <span className={ui.cardMeta}>
            Попросили согласие у родителя: {user.parentEmail}. До подтверждения недоступны чаты, команды и брони —
            каталог и курсы можно смотреть.
          </span>
          <button className={`${ui.ghost} ${ui.small}`} onClick={resendLetter}>
            Отправить письмо ещё раз
          </button>
        </section>
      )}

      <nav className={styles.links} aria-label="Разделы профиля">
        <button className={`${ui.card} ${ui.cardLink} ${styles.link}`} onClick={() => router.push('/chats')}>
          <span className={styles.linkTitle}>Чаты</span>
          {unread > 0 ? <span className={styles.unread}>{unread}</span> : <span className={ui.muted}>›</span>}
        </button>
        <button className={`${ui.card} ${ui.cardLink} ${styles.link}`} onClick={() => router.push('/teams')}>
          <span className={styles.linkTitle}>Команды</span>
          <span className={ui.muted}>{teams.length || '›'}</span>
        </button>
        <button className={`${ui.card} ${ui.cardLink} ${styles.link}`} onClick={() => router.push('/people')}>
          <span className={styles.linkTitle}>Эксперты и обучающиеся</span>
          <span className={ui.muted}>›</span>
        </button>
        <button className={`${ui.card} ${ui.cardLink} ${styles.link}`} onClick={() => router.push('/settings')}>
          <span className={styles.linkTitle}>Настройки</span>
          <span className={ui.muted}>›</span>
        </button>
        {user.role === 'admin' && (
          <button className={`${ui.card} ${ui.cardLink} ${styles.link}`} onClick={() => router.push('/admin')}>
            <span className={styles.linkTitle}>Админка</span>
            <span className={ui.muted}>›</span>
          </button>
        )}
      </nav>

      <section className={`${styles.block} ${styles.bookings}`}>
        <h2 className={ui.sectionTitle}>Мои брони</h2>
        {bookings === null ? (
          <div className="bigLoader" />
        ) : bookings.length === 0 ? (
          <div className={ui.empty}>Броней пока нет — оборудование можно взять в каталоге</div>
        ) : (
          <div className={ui.list}>
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                showAuthor={booking.userId !== user.id}
                onCancel={canCancel(booking) ? cancel : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {consultations.length > 0 && (
        <section className={`${styles.block} ${styles.consultations}`}>
          <h2 className={ui.sectionTitle}>Консультации</h2>
          <div className={ui.list}>
            {consultations.map((item) => (
              <div key={item.id} className={`${ui.card} ${ui.cardWrap}`}>
                <div className={ui.cardBody}>
                  <span className={ui.cardTitle}>{item.Specialist?.name}</span>
                  <span className={ui.cardMeta}>
                    {item.preferredDate
                      ? new Date(item.preferredDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
                      : 'Дата не указана'}
                    {item.preferredTime ? `, ${item.preferredTime}` : ''}
                  </span>
                </div>
                <div className={`${ui.cardActions} ${styles.statusActions}`}>
                  <span className={ui.badge}>{CONSULTATION_STATUS[item.status]}</span>
                  {item.status === 'new' && (
                    <button className={`${ui.ghost} ${ui.small}`} onClick={() => cancelConsultation(item)}>
                      Отменить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <button className={`${ui.danger} ${styles.logout}`} onClick={handleLogout}>
        Выйти из аккаунта
      </button>
    </div>
  )
}
