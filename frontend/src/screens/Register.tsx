'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import CheckField from '@/components/CheckField'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { afterAuthPath } from '@/utils/navigation'
import { MIN_PASSWORD_LENGTH, PARENT_CONSENT_AGE } from '@/utils/legal'
import styles from './Auth.module.css'

const todayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Полных лет по дате рождения YYYY-MM-DD */
const ageFrom = (birthDate: string) => {
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [ty, tm, td] = todayIso().split('-').map(Number)
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0)
}

export default function Register() {
  const router = useRouter()
  const toast = useToast()
  const { register } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const age = useMemo(() => (birthDate ? ageFrom(birthDate) : null), [birthDate])
  const isChild = age !== null && age >= 0 && age < PARENT_CONSENT_AGE

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!name.trim() || !email.trim() || !password || !birthDate) {
      toast.error('Заполните имя, почту, пароль и дату рождения')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Пароль — не короче ${MIN_PASSWORD_LENGTH} символов`)
      return
    }
    if (isChild && !parentEmail.trim()) {
      toast.error('Укажите почту родителя — мы попросим его согласие')
      return
    }
    if (!consent) {
      toast.error('Нужно согласие с соглашением и политикой конфиденциальности')
      return
    }

    setIsLoading(true)
    const result = await register({
      name: name.trim(),
      email: email.trim(),
      password,
      birthDate,
      consent,
      ...(isChild ? { parentName: parentName.trim(), parentEmail: parentEmail.trim() } : {}),
    })
    setIsLoading(false)

    if (!result.success) {
      toast.error(result.error || 'Ошибка регистрации')
      return
    }

    if (result.user?.parentConsentStatus === 'pending') {
      toast.success(
        result.parentLetterSent
          ? 'Аккаунт создан. Мы написали родителю — после его согласия откроются чаты, команды и брони'
          : 'Аккаунт создан. Согласие родителя подтвердит администратор — после этого откроются чаты и брони'
      )
      router.push('/profile')
      return
    }

    toast.success('Регистрация успешна!')
    router.push(afterAuthPath())
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
              placeholder="Как к вам обращаться"
              maxLength={80}
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
              minLength={MIN_PASSWORD_LENGTH}
              placeholder={`Минимум ${MIN_PASSWORD_LENGTH} символов`}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="birthDate">
              Дата рождения
            </label>
            <input
              id="birthDate"
              name="bday"
              className={`${styles.input} ${styles.dateInput}`}
              type="date"
              autoComplete="bday"
              min="1900-01-01"
              max={todayIso()}
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              disabled={isLoading}
            />
          </div>

          {isChild && (
            <fieldset className={styles.parent}>
              <legend className={styles.parentTitle}>Данные родителя</legend>
              <p className={styles.parentText}>
                Вам меньше {PARENT_CONSENT_AGE} лет — по закону нужен родитель или законный представитель. Мы
                отправим ему письмо: после согласия откроются чаты, команды и брони. Каталог и курсы можно
                смотреть сразу.
              </p>
              <input
                className={styles.input}
                type="text"
                autoComplete="off"
                placeholder="Имя родителя"
                maxLength={120}
                value={parentName}
                onChange={(event) => setParentName(event.target.value)}
                disabled={isLoading}
                aria-label="Имя родителя"
              />
              <input
                className={styles.input}
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="Почта родителя"
                value={parentEmail}
                onChange={(event) => setParentEmail(event.target.value)}
                disabled={isLoading}
                aria-label="Почта родителя"
              />
            </fieldset>
          )}

          <CheckField checked={consent} onChange={setConsent} disabled={isLoading} name="consent">
            Принимаю{' '}
            <Link href="/terms" target="_blank" className={styles.inlineLink}>
              пользовательское соглашение
            </Link>{' '}
            и даю согласие на обработку персональных данных по{' '}
            <Link href="/privacy" target="_blank" className={styles.inlineLink}>
              политике конфиденциальности
            </Link>
          </CheckField>

          <button className={styles.submit} type="submit" disabled={isLoading || !consent}>
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
