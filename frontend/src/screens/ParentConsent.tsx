'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import CheckField from '@/components/CheckField'
import { useToast } from '@/hooks/useToast'
import { api, ApiError } from '@/utils/api'
import { COMPANY, SITE_NAME } from '@/utils/legal'
import styles from './Auth.module.css'

interface ConsentInfo {
  childName: string
  parentName?: string | null
  status: string
}

/**
 * Согласие родителя на обработку данных ребёнка до 14 лет.
 * Открывается по ссылке из письма, без входа на сайт.
 */
export default function ParentConsent() {
  const toast = useToast()
  const token = useSearchParams().get('token') ?? ''
  const [info, setInfo] = useState<ConsentInfo | null>(null)
  const [error, setError] = useState<string | null>(token ? null : 'В ссылке нет кода подтверждения')
  const [agree, setAgree] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!token) return
    api
      .get<ConsentInfo>(`/auth/parent-consent?token=${encodeURIComponent(token)}`)
      .then((response) => setInfo(response.data))
      .catch((loadError) =>
        setError(loadError instanceof ApiError ? loadError.message : 'Не удалось открыть ссылку')
      )
  }, [token])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSending(true)
    try {
      const response = await api.post<{ message: string }>('/auth/parent-consent', { token, agree })
      setDone(response.data.message)
    } catch (submitError) {
      toast.error(submitError instanceof ApiError ? submitError.message : 'Не удалось сохранить согласие')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`${styles.container} protoPage`}>
      <ProtoTopBar />
      <div className={styles.content}>
        <div className={styles.head}>
          <h1 className={styles.title}>Согласие родителя</h1>
          <p className={styles.subtitle}>{SITE_NAME} — оборудование и курсы образовательных учреждений</p>
        </div>

        {done ? (
          <p className={`${styles.note} ${styles.noteOk}`}>{done}</p>
        ) : error ? (
          <p className={styles.note}>{error}. Попросите ребёнка отправить письмо ещё раз из профиля.</p>
        ) : !info ? (
          <div className="bigLoader" />
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <p className={styles.note}>
              {info.parentName ? `${info.parentName}, з` : 'З'}дравствуйте! {info.childName} зарегистрировался(-лась) на
              платформе и указал(а) вас как родителя или законного представителя. Пока нет вашего согласия, ребёнок может
              смотреть каталог и курсы, но не может переписываться, вступать в исследовательские команды и бронировать
              оборудование.
            </p>
            <p className={styles.note}>
              Оператор — {COMPANY.name} (ОГРН {COMPANY.ogrn}). Мы обрабатываем имя, почту и дату рождения ребёнка,
              переписку и брони — только чтобы платформа работала. Подробно — в{' '}
              <Link href="/privacy" target="_blank" className={styles.inlineLink}>
                политике конфиденциальности
              </Link>
              . Согласие можно отозвать в любой момент.
            </p>
            <CheckField checked={agree} onChange={setAgree} disabled={sending}>
              Я родитель (законный представитель) и даю согласие на обработку персональных данных ребёнка{' '}
              {info.childName} на условиях{' '}
              <Link href="/privacy" target="_blank" className={styles.inlineLink}>
                политики
              </Link>{' '}
              и{' '}
              <Link href="/terms" target="_blank" className={styles.inlineLink}>
                пользовательского соглашения
              </Link>
            </CheckField>
            <button className={styles.submit} type="submit" disabled={!agree || sending}>
              {sending ? 'Сохраняем...' : 'Подтвердить согласие'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
