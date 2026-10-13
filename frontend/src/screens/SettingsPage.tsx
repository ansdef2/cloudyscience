'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import BottomNav from '@/components/BottomNav'
import Avatar from '@/components/Avatar'
import AuthGate from '@/components/AuthGate'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { User } from '@/models/Api'
import {
  changePassword,
  deleteMyAccount,
  logoutEverywhere,
  removeAvatar,
  resendParentConsent,
  updateName,
} from '@/services/accountService'
import { IMAGE_ACCEPT, uploadAvatar } from '@/services/uploadService'
import { ApiError, clearAuthToken } from '@/utils/api'
import { MIN_PASSWORD_LENGTH } from '@/utils/legal'
import ui from '@/styles/ui.module.css'
import styles from './SettingsPage.module.css'

const errorText = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback)

/** Настройки аккаунта: фото, имя, пароль, согласия, удаление */
export default function SettingsPage() {
  return (
    <div className={`${ui.page} protoPage`}>
      <ProtoTopBar />
      <div className={ui.content}>
        <h1 className={ui.title}>Настройки</h1>
        <AuthGate reason="Войдите, чтобы изменить профиль">{(user) => <Settings initial={user} />}</AuthGate>
      </div>
      <BottomNav />
    </div>
  )
}

function Settings({ initial }: { initial: User }) {
  const router = useRouter()
  const toast = useToast()
  const { logout } = useAuth()
  const [user, setUser] = useState(initial)
  const photoInput = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(initial.name)
  const [savingName, setSavingName] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [deletePassword, setDeletePassword] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault()
    setSavingName(true)
    try {
      setUser(await updateName(name.trim()))
      toast.success('Имя сохранено')
    } catch (error) {
      toast.error(errorText(error, 'Не удалось сохранить имя'))
    } finally {
      setSavingName(false)
    }
  }

  const pickPhoto = async (file?: File) => {
    if (!file) return
    setPhotoBusy(true)
    try {
      const updated = await uploadAvatar(file)
      setUser((current) => ({ ...current, avatar: updated.avatar }))
      toast.success('Фото обновлено')
    } catch (error) {
      toast.error(errorText(error, 'Не удалось загрузить фото'))
    } finally {
      setPhotoBusy(false)
    }
  }

  const dropPhoto = async () => {
    setPhotoBusy(true)
    try {
      setUser(await removeAvatar())
    } catch (error) {
      toast.error(errorText(error, 'Не удалось убрать фото'))
    } finally {
      setPhotoBusy(false)
    }
  }

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (next.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Новый пароль — не короче ${MIN_PASSWORD_LENGTH} символов`)
      return
    }
    if (next !== repeat) {
      toast.error('Пароли не совпадают')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword(current, next)
      setCurrent('')
      setNext('')
      setRepeat('')
      toast.success('Пароль изменён. На других устройствах нужно будет войти заново')
    } catch (error) {
      toast.error(errorText(error, 'Не удалось сменить пароль'))
    } finally {
      setSavingPassword(false)
    }
  }

  const endOtherSessions = async () => {
    try {
      await logoutEverywhere()
      toast.success('Все другие входы завершены')
    } catch (error) {
      toast.error(errorText(error, 'Не получилось'))
    }
  }

  const resend = async () => {
    try {
      const result = await resendParentConsent()
      toast.success(
        result.sent
          ? `Письмо отправлено на ${user.parentEmail}`
          : 'Почта на сайте пока не настроена — согласие подтвердит администратор'
      )
    } catch (error) {
      toast.error(errorText(error, 'Не удалось отправить письмо'))
    }
  }

  const removeAccount = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await deleteMyAccount(deletePassword)
      clearAuthToken()
      logout()
      toast.success('Аккаунт удалён')
      router.push('/')
    } catch (error) {
      toast.error(errorText(error, 'Не удалось удалить аккаунт'))
    }
  }

  return (
    <div className={styles.layout}>
      <section className={`${ui.panel} ${styles.photo}`}>
        <Avatar name={user.name} src={user.avatar} size={88} />
        <div className={styles.photoActions}>
          <input
            ref={photoInput}
            type="file"
            accept={IMAGE_ACCEPT}
            hidden
            onChange={(event) => {
              pickPhoto(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <button className={`${ui.primary} ${ui.small}`} onClick={() => photoInput.current?.click()} disabled={photoBusy}>
            {photoBusy ? 'Загружаем...' : user.avatar ? 'Сменить фото' : 'Загрузить фото'}
          </button>
          {user.avatar && (
            <button className={`${ui.ghost} ${ui.small}`} onClick={dropPhoto} disabled={photoBusy}>
              Убрать
            </button>
          )}
          <span className={ui.muted}>PNG, JPG или WEBP до 8 МБ</span>
        </div>
      </section>

      {user.parentConsentStatus === 'pending' && (
        <section className={`${ui.panel} ${styles.notice}`}>
          <h2 className={styles.panelTitle}>Ждём согласия родителя</h2>
          <p className={styles.text}>
            Мы написали на {user.parentEmail}. Пока родитель не подтвердит, чаты, команды и брони недоступны.
          </p>
          <button className={`${ui.ghost} ${ui.small} ${styles.left}`} onClick={resend}>
            Отправить письмо ещё раз
          </button>
        </section>
      )}

      <form className={ui.panel} onSubmit={saveName}>
        <h2 className={styles.panelTitle}>Профиль</h2>
        <label className={ui.field}>
          <span className={ui.label}>Имя</span>
          <input className={ui.input} value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Почта</span>
          <input className={ui.input} value={user.email} readOnly disabled />
          <span className={styles.hint}>Сменить почту можно через администратора площадки</span>
        </label>
        <button
          className={`${ui.primary} ${styles.left}`}
          type="submit"
          disabled={savingName || name.trim() === user.name || name.trim().length < 2}
        >
          {savingName ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </form>

      <form className={ui.panel} onSubmit={savePassword}>
        <h2 className={styles.panelTitle}>Пароль</h2>
        <input type="text" name="username" autoComplete="username" value={user.email} hidden readOnly />
        <label className={ui.field}>
          <span className={ui.label}>Текущий пароль</span>
          <input
            className={ui.input}
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
        </label>
        <div className={`${ui.row} ${styles.stackOnPhone}`}>
          <label className={ui.field}>
            <span className={ui.label}>Новый пароль</span>
            <input
              className={ui.input}
              type="password"
              autoComplete="new-password"
              placeholder={`От ${MIN_PASSWORD_LENGTH} символов`}
              value={next}
              onChange={(event) => setNext(event.target.value)}
            />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Ещё раз</span>
            <input
              className={ui.input}
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(event) => setRepeat(event.target.value)}
            />
          </label>
        </div>
        <div className={styles.buttons}>
          <button className={ui.primary} type="submit" disabled={savingPassword || !current || !next}>
            {savingPassword ? 'Сохраняем...' : 'Сменить пароль'}
          </button>
          <button className={ui.ghost} type="button" onClick={endOtherSessions}>
            Выйти на других устройствах
          </button>
        </div>
      </form>

      <section className={ui.panel}>
        <h2 className={styles.panelTitle}>Документы</h2>
        <p className={styles.text}>
          {user.consentAt
            ? `Согласие на обработку данных дано ${new Date(user.consentAt).toLocaleDateString('ru-RU')}.`
            : 'Согласие на обработку данных ещё не дано.'}{' '}
          <Link href="/privacy" className={styles.link}>
            Политика конфиденциальности
          </Link>{' '}
          ·{' '}
          <Link href="/terms" className={styles.link}>
            Пользовательское соглашение
          </Link>
        </p>
      </section>

      {user.role !== 'admin' && (
        <section className={`${ui.panel} ${styles.danger}`}>
          <h2 className={styles.panelTitle}>Удалить аккаунт</h2>
          <p className={styles.text}>
            Имя, почта, фото и переписка удалятся, будущие брони отменятся, места на курсах освободятся. Вернуть
            аккаунт будет нельзя.
          </p>
          {confirmDelete ? (
            <form className={styles.deleteForm} onSubmit={removeAccount}>
              <input
                className={ui.input}
                type="password"
                autoComplete="current-password"
                placeholder="Пароль для подтверждения"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
              />
              <div className={styles.buttons}>
                <button className={ui.danger} type="submit" disabled={!deletePassword}>
                  Удалить навсегда
                </button>
                <button className={ui.ghost} type="button" onClick={() => setConfirmDelete(false)}>
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <button className={`${ui.danger} ${styles.left}`} onClick={() => setConfirmDelete(true)}>
              Удалить аккаунт
            </button>
          )}
        </section>
      )}
    </div>
  )
}
