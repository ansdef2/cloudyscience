'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { afterAuthPath } from '@/utils/navigation'
import styles from './Auth.module.css'

export default function Register() {
  const router = useRouter()
  const toast = useToast()
  const { register } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!name || !email || !password) {
      toast.error('Заполните все поля')
      return
    }

    if (password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов')
      return
    }

    setIsLoading(true)
    const result = await register(name, email, password)
    setIsLoading(false)

    if (result.success) {
      toast.success('Регистрация успешна!')
      router.push(afterAuthPath())
    } else {
      toast.error(result.error || 'Ошибка регистрации')
    }
  }

  return (
    <div className={`${styles.container} protoPage`}>
      <ProtoTopBar />

      <div className={styles.content}>
        <div className={styles.head}>
          <h1 className={styles.title}>Регистрация</h1>
          <p className={styles.subtitle}>Создайте аккаунт для начала работы</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} method="post" autoComplete="on">
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              Имя
            </label>
            <input
              id="name"
              name="name"
              className={styles.input}
              type="text"
              autoComplete="name"
              placeholder="Введите имя"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isLoading}
            />
          </div>

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
            <input
              id="password"
              name="password"
              className={styles.input}
              type="password"
              autoComplete="new-password"
              minLength={6}
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
            />
          </div>

          <button className={styles.submit} type="submit" disabled={isLoading}>
            {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>

          <p className={styles.switch}>
            Уже есть аккаунт?{' '}
            <button
              className={styles.link}
              type="button"
              onClick={() => router.push(`/login${window.location.search}`)}
            >
              Войти
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
