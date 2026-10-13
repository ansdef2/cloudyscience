'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import ProtoSearchField from '@/components/ProtoSearchField'
import BottomNav from '@/components/BottomNav'
import Avatar from '@/components/Avatar'
import AuthGate from '@/components/AuthGate'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { useToast } from '@/hooks/useToast'
import { Expert, getExperts, getLearners, Learner, requestConsultation } from '@/services/peopleService'
import { getMyTeams, inviteToTeam, Team } from '@/services/teamService'
import { ApiError } from '@/utils/api'
import { loginPathFromHere } from '@/utils/navigation'
import ui from '@/styles/ui.module.css'
import styles from './PeoplePage.module.css'

type Tab = 'experts' | 'learners'

/**
 * Поиск людей. Эксперты — сотрудники учреждений, к ним записываются на
 * консультацию. Обучающиеся — пользователи платформы: им пишут в чат и
 * зовут в исследовательские команды.
 */
export default function PeoplePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'learners' ? 'learners' : 'experts')
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  const switchTab = (next: Tab) => {
    setTab(next)
    router.replace(next === 'learners' ? '/people?tab=learners' : '/people', { scroll: false })
  }

  return (
    <div className={`${ui.page} protoPage`}>
      <ProtoTopBar />

      <div className={ui.content}>
        <div className={styles.head}>
          <h1 className={ui.title}>Люди</h1>
          <div className={styles.links}>
            <button className={`${ui.ghost} ${ui.small}`} onClick={() => router.push('/chats')}>
              Чаты
            </button>
            <button className={`${ui.ghost} ${ui.small}`} onClick={() => router.push('/teams')}>
              Команды
            </button>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={ui.tabs} role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'experts'}
              className={`${ui.tab} ${tab === 'experts' ? ui.tabActive : ''}`}
              onClick={() => switchTab('experts')}
            >
              Эксперты
            </button>
            <button
              role="tab"
              aria-selected={tab === 'learners'}
              className={`${ui.tab} ${tab === 'learners' ? ui.tabActive : ''}`}
              onClick={() => switchTab('learners')}
            >
              Обучающиеся
            </button>
          </div>

          <ProtoSearchField
            value={query}
            onChange={setQuery}
            placeholder={tab === 'experts' ? 'Имя или специализация' : 'Имя обучающегося'}
          />
        </div>

        <p className={ui.subtitle}>
          {tab === 'experts'
            ? 'Наставники и инженеры учреждений. Запишитесь на консультацию — администратор подтвердит время.'
            : 'Пишите в чат и собирайте команды для исследований.'}
        </p>

        {tab === 'experts' ? (
          <ExpertList query={debouncedQuery} />
        ) : (
          <AuthGate reason="Войдите, чтобы искать обучающихся, писать им и звать в команды">
            {() => <LearnerList query={debouncedQuery} />}
          </AuthGate>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

function ExpertList({ query }: { query: string }) {
  const [experts, setExperts] = useState<Expert[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getExperts(query)
      .then((items) => !cancelled && setExperts(items))
      .catch(() => !cancelled && setExperts([]))
    return () => {
      cancelled = true
    }
  }, [query])

  if (experts === null) return <div className="bigLoader" />
  if (experts.length === 0) return <div className={ui.empty}>Экспертов не нашлось</div>

  return (
    <div className={`${ui.list} ${ui.grid}`}>
      {experts.map((expert) => (
        <div key={expert.id} className={styles.expert}>
          <div className={`${ui.card} ${ui.cardWrap}`}>
            <Avatar name={expert.name} src={expert.avatar} size={48} />
            <div className={ui.cardBody}>
              <span className={ui.cardTitle}>{expert.name}</span>
              {expert.position && <span className={ui.cardMeta}>{expert.position}</span>}
              {expert.Institution && <span className={ui.cardMeta}>{expert.Institution.name}</span>}
            </div>
            <div className={ui.cardActions}>
              <button
                className={`${openId === expert.id ? ui.ghost : ui.primary} ${ui.small}`}
                onClick={() => setOpenId(openId === expert.id ? null : expert.id)}
                aria-expanded={openId === expert.id}
              >
                {openId === expert.id ? 'Скрыть' : 'Консультация'}
              </button>
            </div>
          </div>

          {openId === expert.id && <ConsultationForm expert={expert} onDone={() => setOpenId(null)} />}
        </div>
      ))}
    </div>
  )
}

function ConsultationForm({ expert, onDone }: { expert: Expert; onDone: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const { isAuthenticated } = useAuth()
  const [message, setMessage] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [sending, setSending] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isAuthenticated) {
      router.push(loginPathFromHere())
      return
    }

    setSending(true)
    try {
      await requestConsultation(expert.id, {
        message: message || undefined,
        preferredDate: date || undefined,
        preferredTime: time || undefined,
      })
      toast.success('Заявка отправлена. Администратор подтвердит время')
      onDone()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось отправить заявку')
    } finally {
      setSending(false)
    }
  }

  return (
    <form className={`${ui.panel} ${styles.form}`} onSubmit={submit}>
      <label className={ui.field}>
        <span className={ui.label}>О чём хотите поговорить</span>
        <textarea
          className={ui.textarea}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={`Например: нужен совет по проекту — ${expert.position?.toLowerCase() ?? 'вопрос эксперту'}`}
          maxLength={2000}
        />
      </label>

      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Удобная дата</span>
          <input
            className={ui.input}
            type="date"
            min={today}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Время</span>
          <input className={ui.input} type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
      </div>

      <button className={`${ui.primary} ${ui.block}`} type="submit" disabled={sending}>
        {!isAuthenticated ? 'Войти и записаться' : sending ? 'Отправляем...' : 'Записаться на консультацию'}
      </button>
    </form>
  )
}

function LearnerList({ query }: { query: string }) {
  const router = useRouter()
  const toast = useToast()
  const [learners, setLearners] = useState<Learner[] | null>(null)
  const [ownTeams, setOwnTeams] = useState<Team[]>([])
  const [inviteFor, setInviteFor] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getLearners(query)
      .then((items) => !cancelled && setLearners(items))
      .catch(() => !cancelled && setLearners([]))
    return () => {
      cancelled = true
    }
  }, [query])

  // Звать в команду может её создатель
  useEffect(() => {
    getMyTeams()
      .then((teams) => setOwnTeams(teams.filter((team) => team.myRole === 'owner')))
      .catch(() => setOwnTeams([]))
  }, [])

  const invite = async (team: Team, learner: Learner) => {
    try {
      await inviteToTeam(team.id, learner.id)
      toast.success(`Приглашение в «${team.name}» отправлено — ${learner.name} увидит его в уведомлениях`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось пригласить')
    } finally {
      setInviteFor(null)
    }
  }

  if (learners === null) return <div className="bigLoader" />
  if (learners.length === 0) return <div className={ui.empty}>Никого не нашлось</div>

  return (
    <div className={`${ui.list} ${ui.grid}`}>
      {learners.map((learner) => (
        <div key={learner.id} className={styles.expert}>
          <div className={`${ui.card} ${ui.cardWrap}`}>
            <Avatar name={learner.name} src={learner.avatar} size={44} />
            <div className={ui.cardBody}>
              <span className={ui.cardTitle}>{learner.name}</span>
              <span className={ui.cardMeta}>Обучающийся</span>
            </div>
            <div className={ui.cardActions}>
              <button
                className={`${ui.primary} ${ui.small}`}
                onClick={() => router.push(`/chats/user/${learner.id}`)}
              >
                Написать
              </button>
              <button
                className={`${ui.ghost} ${ui.small}`}
                onClick={() =>
                  ownTeams.length
                    ? setInviteFor(inviteFor === learner.id ? null : learner.id)
                    : router.push('/teams?create=1')
                }
                aria-expanded={inviteFor === learner.id}
                title={ownTeams.length ? 'Пригласить в команду' : 'Сначала создайте команду'}
              >
                Пригласить
              </button>
            </div>
          </div>

          {inviteFor === learner.id && (
            <div className={`${ui.panel} ${styles.form}`}>
              <span className={ui.label}>В какую команду пригласить</span>
              <div className={styles.teamChoices}>
                {ownTeams.map((team) => (
                  <button key={team.id} className={`${ui.ghost} ${ui.small}`} onClick={() => invite(team, learner)}>
                    {team.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
