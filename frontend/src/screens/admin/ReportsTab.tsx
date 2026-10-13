'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { REPORT_REASONS } from '@/services/safetyService'
import { api, ApiError } from '@/utils/api'
import ui from '@/styles/ui.module.css'
import styles from '../AdminPage.module.css'

interface Report {
  id: string
  reason: string
  comment?: string | null
  messageText?: string | null
  status: 'open' | 'resolved' | 'dismissed'
  resolution?: string | null
  createdAt: string
  reporter?: { id: string; name: string; email: string }
  target?: { id: string; name: string; email: string; isBlocked: boolean }
}

const STATUS = [
  { id: 'open', label: 'Новые' },
  { id: 'resolved', label: 'Меры приняты' },
  { id: 'dismissed', label: 'Без нарушений' },
  { id: 'all', label: 'Все' },
]

const reasonLabel = (id: string) => REPORT_REASONS.find((item) => item.id === id)?.label ?? id

/** Жалобы пользователей: разбор, блокировка нарушителя, ответ автору жалобы */
export default function ReportsTab() {
  const toast = useToast()
  const [status, setStatus] = useState('open')
  const [items, setItems] = useState<Report[] | null>(null)

  const load = useCallback(() => {
    api
      .get<Report[]>(`/admin/reports?status=${status}`)
      .then((response) => setItems(response.data))
      .catch(() => setItems([]))
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  const resolve = async (report: Report, next: Report['status']) => {
    const resolution =
      next === 'open' ? '' : (window.prompt('Комментарий для истории (необязательно):', '') ?? undefined)
    if (resolution === undefined) return
    try {
      await api.put(`/admin/reports/${report.id}`, { status: next, resolution })
      toast.success(next === 'open' ? 'Жалоба снова открыта' : 'Решение сохранено, автор жалобы уведомлён')
      load()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не получилось')
    }
  }

  const blockTarget = async (report: Report) => {
    if (!report.target) return
    const reason = window.prompt(`Причина блокировки ${report.target.name}:`, reasonLabel(report.reason))
    if (reason === null) return
    try {
      await api.put(`/admin/users/${report.target.id}`, { isBlocked: true, blockedReason: reason })
      await api.put(`/admin/reports/${report.id}`, { status: 'resolved', resolution: `Заблокирован: ${reason}` })
      toast.success('Нарушитель заблокирован, жалоба закрыта')
      load()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не получилось')
    }
  }

  return (
    <>
      <div className={`${ui.tabs} ${styles.subTabs}`} role="tablist">
        {STATUS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={status === item.id}
            className={`${ui.tab} ${status === item.id ? ui.tabActive : ''}`}
            onClick={() => setStatus(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="bigLoader" />
      ) : items.length === 0 ? (
        <div className={ui.empty}>{status === 'open' ? 'Новых жалоб нет' : 'Пусто'}</div>
      ) : (
        <div className={ui.list}>
          {items.map((report) => (
            <div key={report.id} className={`${ui.panel} ${styles.report}`}>
              <div className={styles.reportHead}>
                <span className={`${ui.badge} ${ui.badgeRed}`}>{reasonLabel(report.reason)}</span>
                <span className={styles.date}>{new Date(report.createdAt).toLocaleString('ru-RU')}</span>
              </div>
              <p className={styles.reportLine}>
                <b>{report.reporter?.name}</b> ({report.reporter?.email}) пожаловался(-лась) на{' '}
                <b>{report.target?.name}</b> ({report.target?.email})
                {report.target?.isBlocked && <span className={`${ui.badge} ${styles.team}`}>уже заблокирован</span>}
              </p>
              {report.messageText && <p className={styles.message}>«{report.messageText}»</p>}
              {report.comment && <p className={styles.reportLine}>Комментарий: {report.comment}</p>}
              {report.resolution && <p className={ui.muted}>Решение: {report.resolution}</p>}

              <div className={styles.fileList}>
                {report.status === 'open' ? (
                  <>
                    {!report.target?.isBlocked && (
                      <button className={`${ui.danger} ${ui.small}`} onClick={() => blockTarget(report)}>
                        Заблокировать нарушителя
                      </button>
                    )}
                    <button className={`${ui.primary} ${ui.small}`} onClick={() => resolve(report, 'resolved')}>
                      Меры приняты
                    </button>
                    <button className={`${ui.ghost} ${ui.small}`} onClick={() => resolve(report, 'dismissed')}>
                      Нарушения нет
                    </button>
                  </>
                ) : (
                  <button className={`${ui.ghost} ${ui.small}`} onClick={() => resolve(report, 'open')}>
                    Открыть снова
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
