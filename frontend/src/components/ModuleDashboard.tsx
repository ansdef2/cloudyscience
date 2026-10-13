'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CourseModule } from '@/models/Api'
import { setStageCompleted } from '@/services/institutionService'
import { useToast } from '@/hooks/useToast'
import { pluralize } from '@/utils/format'
import { loginPathFromHere } from '@/utils/navigation'
import styles from './ModuleDashboard.module.css'

interface ModuleDashboardProps {
  module: CourseModule
  completedStageIds: string[]
  onProgressChange: (ids: string[]) => void
  isAuthenticated: boolean
  /** Прогресс и отметки доступны только записанным на курс */
  isEnrolled: boolean
  /** Показать блок записи — из подсказки у этапа */
  onEnrollRequest?: () => void
}

const RING_SIZE = 72
const RING_STROKE = 6

export default function ModuleDashboard({
  module,
  completedStageIds,
  onProgressChange,
  isAuthenticated,
  isEnrolled,
  onEnrollRequest,
}: ModuleDashboardProps) {
  const router = useRouter()
  const toast = useToast()
  const [openStageId, setOpenStageId] = useState<string | null>(null)
  const [savingStageId, setSavingStageId] = useState<string | null>(null)

  const stages = module.stages ?? []
  const done = stages.filter((stage) => completedStageIds.includes(stage.id)).length
  const percent = stages.length ? Math.round((done / stages.length) * 100) : 0

  const radius = (RING_SIZE - RING_STROKE) / 2
  const circumference = 2 * Math.PI * radius

  const handleToggle = async (stageId: string, nextCompleted: boolean) => {
    setSavingStageId(stageId)
    try {
      const ids = await setStageCompleted(stageId, nextCompleted)
      onProgressChange(ids)
    } catch {
      toast.error('Не удалось сохранить прогресс')
    } finally {
      setSavingStageId(null)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.summary}>
        <div className={`${styles.summaryGlow} protoGlowCard`} />

        {isEnrolled && (
          <div className={styles.ring} style={{ width: RING_SIZE, height: RING_SIZE }}>
            <svg width={RING_SIZE} height={RING_SIZE} aria-hidden>
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={RING_STROKE}
              />
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                fill="none"
                stroke="rgb(var(--proto-glow-green))"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - percent / 100)}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                style={{ transition: 'stroke-dashoffset 0.35s ease' }}
              />
            </svg>
            <span className={styles.ringValue}>{percent}%</span>
          </div>
        )}

        <div className={styles.summaryText}>
          <span className={styles.moduleLabel}>Модуль {module.order}</span>
          <span className={styles.moduleTitle}>{module.title}</span>
          <span className={styles.moduleCount}>
            {isEnrolled
              ? `${done} из ${stages.length} ${pluralize(stages.length, ['этапа', 'этапов', 'этапов'])} пройдено`
              : `${stages.length} ${pluralize(stages.length, ['этап', 'этапа', 'этапов'])}`}
          </span>
        </div>
      </div>

      {module.goal && (
        <div className={styles.block}>
          <div className={styles.blockTitle}>Цель модуля</div>
          <p className={styles.blockText}>{module.goal}</p>
        </div>
      )}

      {module.outcomes?.length > 0 && (
        <div className={styles.block}>
          <div className={styles.blockTitle}>После модуля вы сможете</div>
          <ul className={styles.list}>
            {module.outcomes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.stages}>
        {stages.map((stage) => {
          const isDone = isEnrolled && completedStageIds.includes(stage.id)
          const isOpen = openStageId === stage.id

          return (
            <div key={stage.id} className={`${styles.stage} ${isDone ? styles.stageDone : ''}`}>
              <button
                className={styles.stageHead}
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenStageId(isOpen ? null : stage.id)}
              >
                <span className={`${styles.stageNumber} ${isDone ? styles.stageNumberDone : ''}`}>
                  {isDone ? '✓' : stage.order}
                </span>
                <span className={styles.stageInfo}>
                  <span className={styles.stageTitle}>{stage.title}</span>
                  {stage.outcome && <span className={styles.stageOutcome}>{stage.outcome}</span>}
                </span>
                <svg
                  className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>

              {isOpen && (
                <div className={styles.stageBody}>
                  {stage.summary && <div className={styles.stageSection}>{stage.summary}</div>}
                  {stage.theory && <p className={styles.theory}>{stage.theory}</p>}

                  {isEnrolled ? (
                    <button
                      className={`${styles.toggle} ${isDone ? styles.toggleDone : ''}`}
                      type="button"
                      disabled={savingStageId === stage.id}
                      onClick={() => handleToggle(stage.id, !isDone)}
                    >
                      {isDone ? 'Отменить отметку' : 'Отметить пройденным'}
                    </button>
                  ) : isAuthenticated ? (
                    <p className={styles.guestHint}>
                      <button className={styles.guestLink} type="button" onClick={onEnrollRequest}>
                        Запишитесь на курс
                      </button>
                      , чтобы отмечать пройденные этапы
                    </p>
                  ) : (
                    <p className={styles.guestHint}>
                      <button
                        className={styles.guestLink}
                        type="button"
                        onClick={() => router.push(loginPathFromHere())}
                      >
                        Войдите
                      </button>{' '}
                      и запишитесь на курс, чтобы отмечать пройденные этапы
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {module.resultSummary && (
        <div className={styles.block}>
          <div className={styles.blockTitle}>Итог модуля</div>
          <p className={styles.blockText}>{module.resultSummary}</p>
          {module.resultItems?.length > 0 && (
            <ul className={styles.list} style={{ marginTop: 10 }}>
              {module.resultItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
