'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { getRememberedLogin, loadSavedCredential } from '@/utils/credentials'
import { afterAuthPath } from '@/utils/navigation'
import styles from './Auth.module.css'

export default function Login() {
  const router = useRouter()
  const toast = useToast()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Подставить почту с прошлого входа, а если браузер хранит пароль — и его
  useEffect(() => {
    const remembered = getRememberedLogin()
    setRemember(remembered.remember)
    if (remembered.email) setEmail(remembered.email)

    let cancelled = false
    loadSavedCredential().then((saved) => {
      if (cancelled || !saved) return
      setEmail(saved.email)
      setPassword(saved.password)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!email || !password) {
      toast.error('Заполните все поля')
      return
    }

    setIsLoading(true)
    const result = await login(email, password, remember)
    setIsLoading(false)

    if (result.success) {
      toast.success('Добро пожаловать!')
      router.push(afterAuthPath())
    } else {
      toast.error(result.error || 'Ошибка входа')
    }
  }

  return (
    <div className={styles.container}>
      <ProtoTopBar />

      <div className={styles.content}>
        <div className={styles.head}>
          <h1 className={styles.title}>Войти</h1>
          <p className={styles.subtitle}>Войдите в аккаунт для доступа ко всем функциям</p>
        </div>

        {/* name и autocomplete нужны менеджеру паролей, чтобы узнать форму входа */}
        <form className={styles.form} onSubmit={handleSubmit} method="post" autoComplete="on">
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
              disabled={isLoading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Пароль
            </label>
            <div className={styles.passwordWrap}>
              <input
                id="password"
                name="password"
                className={`${styles.input} ${styles.passwordInput}`}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Введите пароль"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isLoading}
              />
              <button
                className={styles.reveal}
                type="button"
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                  {showPassword && (
                    <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          <label className={styles.remember}>
            <input
              className={styles.rememberInput}
              type="checkbox"
              name="remember"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              disabled={isLoading}
            />
            <span className={styles.rememberBox} aria-hidden>
              <svg viewBox="0 0 14 14" fill="none">
                <path
                  d="m2 7.5 3.5 3.5L12 3.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className={styles.rememberText}>
              Запомнить меня
              <span className={styles.rememberHint}>
                Вход сохранится на этом устройстве, а браузер предложит сохранить пароль
              </span>
            </span>
          </label>

          <button className={styles.submit} type="submit" disabled={isLoading}>
            {isLoading ? 'Вход...' : 'Войти'}
          </button>

          <p className={styles.switch}>
            Нет аккаунта?{' '}
            <button
              className={styles.link}
              type="button"
              onClick={() => router.push(`/register${window.location.search}`)}
            >
              Зарегистрироваться
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
