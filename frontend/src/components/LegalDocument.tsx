import { ReactNode } from 'react'
import Link from 'next/link'
import ProtoTopBar from '@/components/ProtoTopBar'
import { COMPANY, POLICY_DATE } from '@/utils/legal'
import styles from './LegalDocument.module.css'

interface LegalDocumentProps {
  title: string
  children: ReactNode
}

/** Реквизиты оператора: адрес и почта выводятся, когда заполнены в utils/legal.ts */
export function CompanyDetails() {
  return (
    <ul className={styles.details}>
      <li>{COMPANY.fullName}</li>
      <li>
        ОГРН {COMPANY.ogrn}, ИНН {COMPANY.inn}, КПП {COMPANY.kpp}
      </li>
      {COMPANY.address && <li>Адрес: {COMPANY.address}</li>}
      {COMPANY.email && (
        <li>
          Почта: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </li>
      )}
    </ul>
  )
}

/** Куда писать запросы: на почту, если она указана, иначе по адресу из ЕГРЮЛ */
export function ContactLine() {
  return COMPANY.email ? (
    <>
      на почту <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
    </>
  ) : (
    <>письмом по адресу места нахождения Оператора, указанному в ЕГРЮЛ</>
  )
}

/** Оформление юридических страниц: читаемая колонка, оглавление разделами */
export default function LegalDocument({ title, children }: LegalDocumentProps) {
  return (
    <div className={`${styles.page} protoPage`}>
      <ProtoTopBar />
      <article className={styles.content}>
        <header className={styles.head}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.meta}>Редакция от {POLICY_DATE}</p>
        </header>
        {children}
        <footer className={styles.footer}>
          <Link href="/privacy">Политика конфиденциальности</Link>
          <Link href="/terms">Пользовательское соглашение</Link>
        </footer>
      </article>
    </div>
  )
}
