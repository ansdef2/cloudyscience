'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { CourseModule, ModuleStage } from '@/models/Api'
import { api, ApiError } from '@/utils/api'
import ui from '@/styles/ui.module.css'
import styles from '../AdminPage.module.css'
import { Field, FieldDef, fromItem, toPayload, Values } from './catalogFields'

const MODULE_FIELDS: FieldDef[] = [
  { key: 'title', label: 'Название модуля', type: 'text', required: true },
  { key: 'summary', label: 'Коротко о модуле', type: 'textarea' },
  { key: 'goal', label: 'Цель', type: 'textarea' },
  { key: 'outcomes', label: 'Чему научится', type: 'lines', hint: 'по пункту на строку' },
  { key: 'resultSummary', label: 'Итог модуля', type: 'textarea' },
  { key: 'resultItems', label: 'Что получится в итоге', type: 'lines', hint: 'по пункту на строку' },
]

const STAGE_FIELDS: FieldDef[] = [
  { key: 'title', label: 'Название этапа', type: 'text', required: true },
  { key: 'summary', label: 'Что делаем', type: 'textarea' },
  { key: 'outcome', label: 'Результат этапа', type: 'textarea' },
  { key: 'theory', label: 'Теория', type: 'textarea', hint: 'Абзацы — через пустую строку' },
]

const errorText = (error: unknown) => (error instanceof ApiError ? error.message : 'Не получилось')

/** Модули и этапы курса: добавить, изменить, переставить, удалить */
export default function CourseContentEditor({ courseId }: { courseId: string }) {
  const toast = useToast()
  const [modules, setModules] = useState<CourseModule[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(() => {
    api
      .get<{ modules?: CourseModule[] }>(`/courses/${courseId}`)
      .then((response) => setModules(response.data.modules ?? []))
      .catch(() => setModules([]))
  }, [courseId])

  useEffect(() => {
    load()
  }, [load])

  /** Поменять местами два соседних модуля или этапа */
  const swap = async (path: string, a: { id: string; order: number }, b: { id: string; order: number }) => {
    try {
      await api.put(`${path}/${a.id}`, { order: b.order })
      await api.put(`${path}/${b.id}`, { order: a.order })
      load()
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  if (modules === null) return <div className="bigLoader" />

  return (
    <section className={styles.content}>
      <div className={styles.groupHead}>
        <h3 className={styles.contentTitle}>Содержание курса</h3>
        <button className={`${ui.ghost} ${ui.small}`} onClick={() => setAdding(!adding)}>
          + Модуль
        </button>
      </div>

      {adding && (
        <PartForm
          fields={MODULE_FIELDS}
          item={null}
          onSubmit={async (payload) => {
            await api.post(`/courses/${courseId}/modules`, payload)
            setAdding(false)
            load()
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {modules.length === 0 && !adding && <div className={ui.empty}>Модулей пока нет</div>}

      {modules.map((module, index) => (
        <div key={module.id} className={styles.module}>
          <div className={styles.moduleHead}>
            <button
              className={styles.moduleToggle}
              onClick={() => setOpen(open === module.id ? null : module.id)}
              aria-expanded={open === module.id}
            >
              <span className={styles.moduleNumber}>{index + 1}</span>
              <span>{module.title}</span>
              <span className={ui.muted}>· этапов {module.stages?.length ?? 0}</span>
            </button>
            <div className={styles.order}>
              <button
                className={`${ui.ghost} ${ui.small}`}
                disabled={index === 0}
                onClick={() => swap('/courses/modules', module, modules[index - 1])}
                aria-label="Выше"
              >
                ↑
              </button>
              <button
                className={`${ui.ghost} ${ui.small}`}
                disabled={index === modules.length - 1}
                onClick={() => swap('/courses/modules', module, modules[index + 1])}
                aria-label="Ниже"
              >
                ↓
              </button>
            </div>
          </div>

          {open === module.id && (
            <div className={styles.moduleBody}>
              <PartForm
                fields={MODULE_FIELDS}
                item={module}
                onSubmit={async (payload) => {
                  await api.put(`/courses/modules/${module.id}`, payload)
                  toast.success('Модуль сохранён')
                  load()
                }}
                onDelete={async () => {
                  if (!window.confirm(`Удалить модуль «${module.title}» вместе с этапами и отметками прохождения?`))
                    return
                  await api.delete(`/courses/modules/${module.id}`)
                  load()
                }}
              />
              <StageList moduleId={module.id} stages={module.stages ?? []} onChange={load} onSwap={swap} />
            </div>
          )}
        </div>
      ))}
    </section>
  )
}

function StageList({
  moduleId,
  stages,
  onChange,
  onSwap,
}: {
  moduleId: string
  stages: ModuleStage[]
  onChange: () => void
  onSwap: (path: string, a: ModuleStage, b: ModuleStage) => void
}) {
  const toast = useToast()
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <div className={styles.stages}>
      <div className={styles.groupHead}>
        <span className={ui.label}>Этапы</span>
        <button className={`${ui.ghost} ${ui.small}`} onClick={() => setAdding(!adding)}>
          + Этап
        </button>
      </div>

      {adding && (
        <PartForm
          fields={STAGE_FIELDS}
          item={null}
          onSubmit={async (payload) => {
            await api.post(`/courses/modules/${moduleId}/stages`, payload)
            setAdding(false)
            onChange()
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {stages.map((stage, index) => (
        <div key={stage.id} className={styles.stage}>
          <div className={styles.moduleHead}>
            <button className={styles.moduleToggle} onClick={() => setOpen(open === stage.id ? null : stage.id)}>
              <span className={styles.stageNumber}>{index + 1}</span>
              <span>{stage.title}</span>
            </button>
            <div className={styles.order}>
              <button
                className={`${ui.ghost} ${ui.small}`}
                disabled={index === 0}
                onClick={() => onSwap('/courses/stages', stage, stages[index - 1])}
                aria-label="Выше"
              >
                ↑
              </button>
              <button
                className={`${ui.ghost} ${ui.small}`}
                disabled={index === stages.length - 1}
                onClick={() => onSwap('/courses/stages', stage, stages[index + 1])}
                aria-label="Ниже"
              >
                ↓
              </button>
            </div>
          </div>
          {open === stage.id && (
            <PartForm
              fields={STAGE_FIELDS}
              item={stage}
              onSubmit={async (payload) => {
                await api.put(`/courses/stages/${stage.id}`, payload)
                toast.success('Этап сохранён')
                onChange()
              }}
              onDelete={async () => {
                if (!window.confirm(`Удалить этап «${stage.title}»?`)) return
                await api.delete(`/courses/stages/${stage.id}`)
                onChange()
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function PartForm({
  fields,
  item,
  onSubmit,
  onDelete,
  onCancel,
}: {
  fields: FieldDef[]
  item: Values | null
  onSubmit: (payload: Values) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel?: () => void
}) {
  const toast = useToast()
  const [values, setValues] = useState<Values>(() => fromItem(fields, item))
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!String(values.title ?? '').trim()) {
      toast.error('Нужно название')
      return
    }
    setSaving(true)
    try {
      await onSubmit(toPayload(fields, values))
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.entityForm} onSubmit={submit}>
      {fields.map((field) => (
        <Field
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
        />
      ))}
      <div className={styles.formActions}>
        {onDelete && (
          <button
            type="button"
            className={`${ui.danger} ${ui.small}`}
            onClick={() => onDelete().catch((error) => toast.error(errorText(error)))}
          >
            Удалить
          </button>
        )}
        <span className={styles.spacer} />
        {onCancel && (
          <button type="button" className={`${ui.ghost} ${ui.small}`} onClick={onCancel}>
            Отмена
          </button>
        )}
        <button type="submit" className={`${ui.primary} ${ui.small}`} disabled={saving}>
          {saving ? 'Сохраняем...' : item ? 'Сохранить' : 'Добавить'}
        </button>
      </div>
    </form>
  )
}
