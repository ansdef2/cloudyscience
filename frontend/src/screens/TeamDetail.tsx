'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import Avatar from '@/components/Avatar'
import AuthGate from '@/components/AuthGate'
import { User } from '@/models/Api'
import { Booking } from '@/services/bookingService'
import { deleteTeam, getTeam, removeTeamMember, Team } from '@/services/teamService'
import { useToast } from '@/hooks/useToast'
import { api, ApiError } from '@/utils/api'
import { BOOKING_STATUS } from '@/utils/format'
import ui from '@/styles/ui.module.css'
import styles from './Teams.module.css'

export default function TeamDetail({ teamId }: { teamId: string }) {
  return (
    <div className={`${ui.page} protoPage`}>
      <ProtoTopBar />
      <div className={ui.content}>
        <AuthGate reason="Войдите, чтобы открыть команду">{(user) => <TeamView teamId={teamId} me={user} />}</AuthGate>
      </div>
    </div>
  )
}

function TeamView({ teamId, me }: { teamId: string; me: User }) {
  const router = useRouter()
  const toast = useToast()
  const [team, setTeam] = useState<Team | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = () =>
    getTeam(teamId)
      .then(setTeam)
      .catch((loadError) => setError(loadError instanceof ApiError ? loadError.message : 'Команда недоступна'))

  useEffect(() => {
    load()
    api
      .get<any[]>(`/teams/${teamId}/bookings`)
      .then((response) =>
        setBookings(response.data.map((item) => ({ ...item, equipment: item.Equipment, user: item.User })))
      )
      .catch(() => setBookings([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId])

  if (error) return <div className={ui.empty}>{error}</div>
  if (!team) return <div className="bigLoader" />

  const isOwner = team.myRole === 'owner'

  const remove = async (userId: string, name: string) => {
    if (!window.confirm(userId === me.id ? 'Выйти из команды?' : `Убрать ${name} из команды?`)) return
    try {
      await removeTeamMember(team.id, userId)
      if (userId === me.id) {
        toast.success('Вы вышли из команды')
        router.push('/teams')
      } else {
        load()
      }
    } catch (removeError) {
      toast.error(removeError instanceof ApiError ? removeError.message : 'Не получилось')
    }
  }

  const destroy = async () => {
    if (!window.confirm(`Удалить команду «${team.name}»? Чат и участие пропадут, брони останутся у авторов.`)) return
    try {
      await deleteTeam(team.id)
      toast.success('Команда удалена')
      router.push('/teams')
    } catch (deleteError) {
      toast.error(deleteError instanceof ApiError ? deleteError.message : 'Не удалось удалить')
    }
  }

  return (
    <div className={styles.detail}>
      <section className={`${ui.panel} ${styles.hero}`}>
        <span className={`${styles.teamMark} ${styles.teamMarkLarge}`} aria-hidden>
          {team.name.charAt(0).toUpperCase()}
        </span>
        <h1 className={ui.title}>{team.name}</h1>
        <div className={ui.field}>
          <span className={ui.label}>Тема исследования</span>
          <p className={styles.topicFull}>{team.description || 'Тема пока не описана'}</p>
        </div>
        <div className={styles.heroActions}>
          <button className={ui.primary} onClick={() => router.push(`/chats/team/${team.id}`)}>
            Чат команды
          </button>
          <button className={ui.ghost} onClick={() => router.push('/equipment')}>
            Забронировать оборудование
          </button>
        </div>
      </section>

      <div className={styles.columns}>
        <section className={styles.block}>
          <div className={styles.blockHead}>
            <h2 className={ui.sectionTitle}>Участники</h2>
            {isOwner && (
              <button className={`${ui.ghost} ${ui.small}`} onClick={() => router.push('/people?tab=learners')}>
                + Добавить
              </button>
            )}
          </div>
          <div className={ui.list}>
            {team.members?.map((member) => (
              <div key={member.userId} className={`${ui.card} ${ui.cardWrap}`}>
                <Avatar name={member.User?.name ?? '?'} src={member.User?.avatar} size={40} />
                <div className={ui.cardBody}>
                  <span className={ui.cardTitle}>
                    {member.User?.name}
                    {member.userId === me.id && <span className={ui.muted}> · вы</span>}
                  </span>
                  <span className={ui.cardMeta}>{member.role === 'owner' ? 'Создатель' : 'Участник'}</span>
                </div>
                <div className={ui.cardActions}>
                  {member.userId !== me.id && (
                    <button
                      className={`${ui.ghost} ${ui.small}`}
                      onClick={() => router.push(`/chats/user/${member.userId}`)}
                    >
                      Написать
                    </button>
                  )}
                  {isOwner && member.role !== 'owner' && (
                    <button
                      className={`${ui.danger} ${ui.small}`}
                      onClick={() => remove(member.userId, member.User?.name ?? '')}
                      aria-label={`Убрать ${member.User?.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.block}>
          <h2 className={ui.sectionTitle}>Брони команды</h2>
          {bookings.length === 0 ? (
            <div className={ui.empty}>
              Пока нет. При бронировании оборудования выберите эту команду — бронь увидят все участники.
            </div>
          ) : (
            <div className={ui.list}>
              {bookings.map((booking) => (
                <div key={booking.id} className={`${ui.card} ${ui.cardWrap}`}>
                  <div className={ui.cardBody}>
                    <span className={ui.cardTitle}>{booking.equipment?.name ?? 'Оборудование'}</span>
                    <span className={ui.cardMeta}>
                      {new Date(booking.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })},{' '}
                      {booking.time} · оформил(а) {booking.user?.name}
                    </span>
                  </div>
                  <span className={ui.badge}>{BOOKING_STATUS[booking.status] ?? booking.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className={styles.dangerZone}>
        {isOwner ? (
          <button className={ui.danger} onClick={destroy}>
            Удалить команду
          </button>
        ) : (
          <button className={ui.danger} onClick={() => remove(me.id, me.name)}>
            Выйти из команды
          </button>
        )}
      </div>
    </div>
  )
}
