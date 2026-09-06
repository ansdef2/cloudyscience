'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import styles from './Auth.module.css'

export default function Login() {
  const router = useRouter()
  const toast = useToast()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!email || !password) {
      toast.error('Заполните все поля')
      return
    }

    setIsLoading(true)
    const result = await login(email, password)
    setIsLoading(false)

    if (result.success) {
      toast.success('Добро пожаловать!')
      router.push('/')
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

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
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
            <input
              id="password"
              className={styles.input}
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
            />
          </div>

          <button className={styles.submit} type="submit" disabled={isLoading}>
            {isLoading ? 'Вход...' : 'Войти'}
          </button>

          <p className={styles.switch}>
            Нет аккаунта?{' '}
            <button className={styles.link} type="button" onClick={() => router.push('/register')}>
              Зарегистрироваться
            </button>
          </p>
        </form>

        <div className={styles.hint}>
          <div className={`${styles.hintGlow} protoGlowCard`} />
          <p className={styles.hintTitle}>Тестовый аккаунт</p>
          <div className={styles.hintRow}>
            <span className={styles.hintLabel}>Email</span>
            <span>user@cloudco.ru</span>
          </div>
          <div className={styles.hintRow}>
            <span className={styles.hintLabel}>Пароль</span>
            <span>user123</span>
          </div>
        </div>
      </div>
    </div>
  )
}
