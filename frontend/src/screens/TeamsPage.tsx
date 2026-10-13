'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import BottomNav from '@/components/BottomNav'
import AuthGate from '@/components/AuthGate'
import Avatar from '@/components/Avatar'
import {
  createTeam,
  getMyInvitations,
  getMyTeams,
  respondInvitation,
  Team,
  TeamInvitation,
} from '@/services/teamService'
import { useToast } from '@/hooks/useToast'
import { ApiError } from '@/utils/api'
import { pluralize } from '@/utils/format'
import ui from '@/styles/ui.module.css'
import styles from './Teams.module.css'

/** Мои исследовательские команды и создание новой */
export default function TeamsPage() {
  return (
    <div className={`${ui.page} protoPage`}>
      <ProtoTopBar />

      <div className={ui.content}>
        <h1 className={ui.title}>Команды</h1>
        <p className={ui.subtitle}>
          Команда объединяет людей вокруг исследования: общий чат, участники и брони оборудования на всех.
        </p>
        <AuthGate reason="Войдите, чтобы создавать команды и работать в них">{() => <TeamList />}</AuthGate>
      </div>

      <BottomNav />
    </div>
  )
}

function TeamList() {
  const router = useRouter()
  const toast = useToast()
  const searchParams = useSearchParams()
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [creating, setCreating] = useState(searchParams.get('create') === '1')
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [saving, setSaving] = useState(false)
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])

  useEffect(() => {
    getMyTeams()
      .then(setTeams)
      .catch(() => setTeams([]))
    getMyInvitations()
      .then(setInvitations)
      .catch(() => setInvitations([]))
  }, [])

  const respond = async (invitation: TeamInvitation, accept: boolean) => {
    try {
      const result = await respondInvitation(invitation.id, accept)
      setInvitations((current) => current.filter((item) => item.id !== invitation.id))
      if (accept) {
        toast.success(`Вы в команде «${invitation.Team?.name}»`)
        router.push(`/teams/${result.teamId}`)
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не получилось')
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const team = await createTeam({ name: name.trim(), description: topic.trim() || undefined })
      toast.success('Команда создана')
      router.push(`/teams/${team.id}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось создать команду')
      setSaving(false)
    }
  }

  return (
    <>
      {invitations.length > 0 && (
        <section className={styles.invitations}>
          <h2 className={ui.sectionTitle}>Приглашения</h2>
          <div className={`${ui.list} ${ui.grid}`}>
            {invitations.map((invitation) => (
              <div key={invitation.id} className={`${ui.card} ${ui.cardWrap} ${styles.invitation}`}>
                <Avatar name={invitation.inviter?.name ?? '?'} src={invitation.inviter?.avatar} size={40} />
                <div className={ui.cardBody}>
                  <span className={ui.cardTitle}>«{invitation.Team?.name}»</span>
                  <span className={ui.cardMeta}>
                    Зовёт {invitation.inviter?.name}
                    {invitation.Team?.description ? ` · ${invitation.Team.description}` : ''}
                  </span>
                </div>
                <div className={ui.cardActions}>
                  <button className={`${ui.primary} ${ui.small}`} onClick={() => respond(invitation, true)}>
                    Принять
                  </button>
                  <button className={`${ui.ghost} ${ui.small}`} onClick={() => respond(invitation, false)}>
                    Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {creating ? (
        <form className={ui.panel} onSubmit={submit}>
          <label className={ui.field}>
            <span className={ui.label}>Название</span>
            <input
              className={ui.input}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например: Сенсоры Волхова"
              minLength={2}
              maxLength={80}
              required
              autoFocus
            />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Тема исследования</span>
            <textarea
              className={ui.textarea}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Что изучаете и зачем — коротко, чтобы участникам было понятно"
              maxLength={2000}
            />
          </label>
          <div className={ui.row}>
            <button className={ui.ghost} type="button" onClick={() => setCreating(false)}>
              Отмена
            </button>
            <button className={ui.primary} type="submit" disabled={saving || name.trim().length < 2}>
              {saving ? 'Создаём...' : 'Создать'}
            </button>
          </div>
        </form>
      ) : (
        <button className={`${ui.primary} ${styles.create}`} onClick={() => setCreating(true)}>
          + Новая команда
        </button>
      )}

      {teams === null ? (
        <div className="bigLoader" />
      ) : teams.length === 0 ? (
        <div className={ui.empty}>Вы пока не состоите ни в одной команде</div>
      ) : (
        <div className={`${ui.list} ${ui.grid}`}>
          {teams.map((team) => {
            const count = team.members?.length ?? 0
            return (
              <div
                key={team.id}
                className={`${ui.card} ${ui.cardLink} ${styles.teamCard}`}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/teams/${team.id}`)}
                onKeyDown={(event) => event.key === 'Enter' && router.push(`/teams/${team.id}`)}
              >
                <span className={styles.teamMark} aria-hidden>
                  {team.name.charAt(0).toUpperCase()}
                </span>
                <div className={ui.cardBody}>
                  <span className={ui.cardTitle}>{team.name}</span>
                  {team.description && <span className={`${ui.cardMeta} ${styles.topic}`}>{team.description}</span>}
                  <span className={ui.cardMeta}>
                    {count} {pluralize(count, ['участник', 'участника', 'участников'])}
                  </span>
                </div>
                {team.myRole === 'owner' && <span className={`${ui.badge} ${ui.badgeGreen}`}>создатель</span>}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
