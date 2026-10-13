'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import { useToast } from '@/hooks/useToast'
import { api, ApiError, clearAuthToken } from '@/utils/api'
import { MIN_PASSWORD_LENGTH } from '@/utils/legal'
import styles from './Auth.module.css'

/** Новый пароль по ссылке из письма */
export default function ResetPassword() {
  const router = useRouter()
  const toast = useToast()
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [saving, setSaving] = useState(false)
  const [invalid, setInvalid] = useState(!token)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Пароль — не короче ${MIN_PASSWORD_LENGTH} символов`)
      return
    }
    if (password !== repeat) {
      toast.error('Пароли не совпадают')
      return
    }

    setSaving(true)
    try {
      await api.post('/auth/reset', { token, password })
      // Прежние входы больше не действуют — в том числе на этом устройстве
      clearAuthToken()
      toast.success('Пароль изменён. Войдите с новым паролем')
      router.push('/login')
    } catch (error) {
      if (error instanceof ApiError && error.data?.code === 'TOKEN_INVALID') setInvalid(true)
      toast.error(error instanceof ApiError ? error.message : 'Не удалось сменить пароль')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`${styles.container} protoPage`}>
      <ProtoTopBar />
      <div className={styles.content}>
        <div className={styles.head}>
          <h1 className={styles.title}>Новый пароль</h1>
          <p className={styles.subtitle}>После смены пароля все прежние входы завершатся</p>
        </div>

        {invalid ? (
          <>
            <p className={styles.note}>Ссылка устарела или уже использована. Запросите новую — она действует час.</p>
            <Link href="/forgot" className={styles.submit}>
              Запросить ссылку
            </Link>
          </>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <input type="text" name="username" autoComplete="username" hidden readOnly />
            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                Новый пароль
              </label>
              <input
                id="password"
                className={styles.input}
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                placeholder={`Минимум ${MIN_PASSWORD_LENGTH} символов`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="repeat">
                Повторите пароль
              </label>
              <input
                id="repeat"
                className={styles.input}
                type="password"
                autoComplete="new-password"
                value={repeat}
                onChange={(event) => setRepeat(event.target.value)}
                disabled={saving}
              />
            </div>
            <button className={styles.submit} type="submit" disabled={saving}>
              {saving ? 'Сохраняем...' : 'Сохранить пароль'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
