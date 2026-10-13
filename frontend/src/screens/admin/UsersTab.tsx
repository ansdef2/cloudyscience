'use client'

import { useCallback, useEffect, useState } from 'react'
import Avatar from '@/components/Avatar'
import { useDebounce } from '@/hooks/useDebounce'
import { useToast } from '@/hooks/useToast'
import { api, ApiError } from '@/utils/api'
import ui from '@/styles/ui.module.css'
import styles from '../AdminPage.module.css'

export interface AdminUser {
  id: string
  name: string
  email: string
  avatar?: string | null
  role: 'user' | 'admin'
  birthDate?: string | null
  parentConsentStatus: 'not_required' | 'pending' | 'confirmed'
  parentName?: string | null
  parentEmail?: string | null
  isBlocked: boolean
  blockedReason?: string | null
  consentAt?: string | null
  createdAt: string
}

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'consent', label: 'Ждут согласия родителя' },
  { id: 'blocked', label: 'Заблокированные' },
  { id: 'admins', label: 'Администраторы' },
]

const errorText = (error: unknown) => (error instanceof ApiError ? error.message : 'Не получилось')

/** Пользователи: поиск, блокировка, роли, ссылки для сброса пароля и согласия родителя */
export default function UsersTab({ meId }: { meId: string }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const debounced = useDebounce(query, 300)
  const [users, setUsers] = useState<AdminUser[] | null>(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (debounced.trim()) params.set('search', debounced.trim())
    if (filter !== 'all') params.set('filter', filter)
    api
      .get<AdminUser[]>(`/admin/users?${params}`)
      .then((response) => setUsers(response.data))
      .catch(() => setUsers([]))
  }, [debounced, filter])

  useEffect(() => {
    load()
  }, [load])

  const replace = (user: AdminUser) =>
    setUsers((current) => current?.map((row) => (row.id === user.id ? user : row)) ?? null)

  return (
    <>
      <div className={styles.filters}>
        <input
          className={ui.input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Имя или почта"
          aria-label="Поиск пользователей"
        />
        <select
          className={ui.select}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Фильтр"
        >
          {FILTERS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {users === null ? (
        <div className="bigLoader" />
      ) : users.length === 0 ? (
        <div className={ui.empty}>Никого не нашлось</div>
      ) : (
        <div className={ui.list}>
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              isMe={user.id === meId}
              onChange={replace}
              onRemoved={() => setUsers((current) => current?.filter((row) => row.id !== user.id) ?? null)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function UserRow({
  user,
  isMe,
  onChange,
  onRemoved,
}: {
  user: AdminUser
  isMe: boolean
  onChange: (user: AdminUser) => void
  onRemoved: () => void
}) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<{ label: string; url: string } | null>(null)

  const update = async (changes: Record<string, unknown>, done: string) => {
    try {
      const { data } = await api.put<AdminUser>(`/admin/users/${user.id}`, changes)
      onChange(data)
      toast.success(done)
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  const block = () => {
    const reason = window.prompt(`Причина блокировки ${user.name} (её увидит пользователь при входе):`, '')
    if (reason === null) return
    update({ isBlocked: true, blockedReason: reason }, 'Пользователь заблокирован')
  }

  const makeLink = async (path: string, label: string) => {
    try {
      const { data } = await api.post<{ url: string; sent?: boolean }>(`/admin/users/${user.id}/${path}`)
      setLink({ label, url: data.url })
      if (data.sent) toast.success('Письмо родителю отправлено повторно')
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link.url)
      toast.success('Ссылка скопирована')
    } catch {
      toast.error('Скопируйте ссылку вручную')
    }
  }

  const remove = async () => {
    if (!window.confirm(`Удалить аккаунт ${user.name}? Данные обезличатся, вернуть нельзя.`)) return
    try {
      await api.delete(`/admin/users/${user.id}`)
      toast.success('Аккаунт удалён')
      onRemoved()
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  return (
    <div className={styles.bookingItem}>
      <div className={`${ui.card} ${styles.row}`}>
        <Avatar name={user.name} src={user.avatar} size={40} />
        <div className={ui.cardBody}>
          <span className={ui.cardTitle}>
            {user.name}
            {isMe && <span className={ui.muted}> · вы</span>}
          </span>
          <a className={`${ui.cardMeta} ${styles.mail}`} href={`mailto:${user.email}`}>
            {user.email}
          </a>
          <span className={styles.badges}>
            {user.role === 'admin' && <span className={`${ui.badge} ${ui.badgeGreen}`}>администратор</span>}
            {user.isBlocked && (
              <span className={`${ui.badge} ${ui.badgeRed}`}>
                заблокирован{user.blockedReason ? `: ${user.blockedReason}` : ''}
              </span>
            )}
            {user.parentConsentStatus === 'pending' && (
              <span className={`${ui.badge} ${ui.badgeBlue}`}>ждёт согласия родителя</span>
            )}
            {user.parentConsentStatus === 'confirmed' && <span className={ui.badge}>до 14 лет, согласие есть</span>}
            <span className={ui.badge}>с {new Date(user.createdAt).toLocaleDateString('ru-RU')}</span>
          </span>
        </div>
        <button className={`${ui.ghost} ${ui.small}`} onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Скрыть' : 'Действия'}
        </button>
      </div>

      {open && (
        <div className={`${ui.panel} ${styles.bookingDetails}`}>
          {user.parentConsentStatus !== 'not_required' && (
            <p className={styles.message}>
              Родитель: {user.parentName || 'имя не указано'}, {user.parentEmail}
              {user.birthDate ? ` · дата рождения ${new Date(user.birthDate).toLocaleDateString('ru-RU')}` : ''}
            </p>
          )}

          <div className={styles.fileList}>
            <button
              className={`${ui.ghost} ${ui.small}`}
              onClick={() => makeLink('reset-link', 'Сброс пароля, действует час')}
            >
              Ссылка для сброса пароля
            </button>
            {user.parentConsentStatus === 'pending' && (
              <>
                <button
                  className={`${ui.ghost} ${ui.small}`}
                  onClick={() => makeLink('parent-consent-link', 'Согласие родителя, действует 14 дней')}
                >
                  Ссылка для родителя
                </button>
                <button
                  className={`${ui.primary} ${ui.small}`}
                  onClick={() => {
                    if (window.confirm('Согласие родителя получено другим способом (например, на бумаге)?')) {
                      update({ parentConsentStatus: 'confirmed' }, 'Согласие отмечено')
                    }
                  }}
                >
                  Согласие получено
                </button>
              </>
            )}
            {!isMe &&
              (user.isBlocked ? (
                <button
                  className={`${ui.ghost} ${ui.small}`}
                  onClick={() => update({ isBlocked: false }, 'Блокировка снята')}
                >
                  Разблокировать
                </button>
              ) : (
                <button className={`${ui.danger} ${ui.small}`} onClick={block}>
                  Заблокировать
                </button>
              ))}
            {!isMe &&
              (user.role === 'admin' ? (
                <button className={`${ui.ghost} ${ui.small}`} onClick={() => update({ role: 'user' }, 'Права сняты')}>
                  Снять права администратора
                </button>
              ) : (
                <button
                  className={`${ui.ghost} ${ui.small}`}
                  onClick={() =>
                    window.confirm(`Сделать ${user.name} администратором? Он увидит все брони и почты.`) &&
                    update({ role: 'admin' }, 'Назначен администратором')
                  }
                >
                  Сделать администратором
                </button>
              ))}
            {!isMe && user.role !== 'admin' && (
              <button className={`${ui.danger} ${ui.small}`} onClick={remove}>
                Удалить аккаунт
              </button>
            )}
          </div>

          {link && (
            <div className={styles.linkBox}>
              <span className={ui.label}>{link.label}. Передайте её человеку сами:</span>
              <input className={ui.input} value={link.url} readOnly onFocus={(event) => event.target.select()} />
              <button className={`${ui.primary} ${ui.small} ${styles.save}`} onClick={copy}>
                Скопировать
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
