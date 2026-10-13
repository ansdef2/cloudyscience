'use client'

import { useState } from 'react'
import Link from 'next/link'
import ProtoTopBar from '@/components/ProtoTopBar'
import { useToast } from '@/hooks/useToast'
import { api, ApiError } from '@/utils/api'
import styles from './Auth.module.css'

/** Забыли пароль: ссылка для сброса уходит на почту */
export default function ForgotPassword() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ message: string; mailConfigured: boolean } | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) {
      toast.error('Укажите почту')
      return
    }
    setSending(true)
    try {
      const response = await api.post<{ message: string; mailConfigured: boolean }>('/auth/forgot', {
        email: email.trim(),
      })
      setResult(response.data)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось отправить запрос')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`${styles.container} protoPage`}>
      <ProtoTopBar />
      <div className={styles.content}>
        <div className={styles.head}>
          <h1 className={styles.title}>Сброс пароля</h1>
          <p className={styles.subtitle}>Пришлём на почту ссылку, по которой можно задать новый пароль</p>
        </div>

        {result ? (
          <>
            <p className={`${styles.note} ${styles.noteOk}`}>{result.message}. Ссылка действует час.</p>
            {!result.mailConfigured && (
              <p className={styles.note}>
                Если письмо не пришло, напишите администратору площадки — он выдаст ссылку для сброса вручную.
              </p>
            )}
            <Link href="/login" className={styles.submit}>
              Вернуться ко входу
            </Link>
          </>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                className={styles.input}
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="example@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={sending}
              />
            </div>
            <button className={styles.submit} type="submit" disabled={sending}>
              {sending ? 'Отправляем...' : 'Прислать ссылку'}
            </button>
            <p className={styles.switch}>
              Вспомнили?{' '}
              <Link href="/login" className={styles.link}>
                Войти
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
