'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { api, ApiError } from '@/utils/api'
import ui from '@/styles/ui.module.css'
import styles from '../AdminPage.module.css'
import CourseContentEditor from './CourseContentEditor'
import { Field, FieldDef, fromItem, resetInstitutionsCache, toPayload, Values } from './catalogFields'

interface Section {
  id: string
  label: string
  endpoint: string
  /** Чем называть запись в списке */
  title: (item: any) => string
  meta: (item: any) => string
  fields: FieldDef[]
  addLabel: string
}

const SECTIONS: Section[] = [
  {
    id: 'institutions',
    label: 'Учреждения',
    endpoint: '/institutions',
    title: (item) => item.name,
    meta: (item) => `${item.address}${item.latitude == null ? ' · нет координат — на карте не появится' : ''}`,
    addLabel: 'Учреждение',
    fields: [
      { key: 'name', label: 'Название', type: 'text', required: true },
      { key: 'address', label: 'Адрес', type: 'text', required: true, placeholder: 'Большая Московская ул., 39' },
      { key: 'workingHours', label: 'Часы работы', type: 'text', required: true, placeholder: '9:00-19:00' },
      { key: 'phone', label: 'Телефон', type: 'text', required: true },
      { key: 'website', label: 'Сайт', type: 'text', placeholder: 'https://' },
      {
        key: 'latitude',
        label: 'Широта',
        type: 'number',
        placeholder: '58.5163',
        hint: 'Координаты точки на карте. Узнать: Яндекс Карты → правый клик по зданию',
      },
      { key: 'longitude', label: 'Долгота', type: 'number', placeholder: '31.2968' },
      { key: 'logo', label: 'Фото или логотип', type: 'image' },
      { key: 'isOpen', label: 'Открыто', type: 'checkbox' },
    ],
  },
  {
    id: 'equipment',
    label: 'Оборудование',
    endpoint: '/equipment',
    title: (item) => item.name,
    meta: (item) =>
      `${item.Institution?.name ?? ''} · ${item.workingHours}${item.isOpen ? '' : ' · не принимает брони'}`,
    addLabel: 'Оборудование',
    fields: [
      { key: 'institutionId', label: 'Учреждение', type: 'institution', required: true },
      { key: 'name', label: 'Название', type: 'text', required: true },
      { key: 'type', label: 'Тип', type: 'text', placeholder: '3D-принтер, VR-шлем, станок…' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      {
        key: 'workingHours',
        label: 'Часы работы',
        type: 'text',
        required: true,
        placeholder: '10:00-17:00',
        hint: 'Из них строятся часовые слоты брони',
      },
      { key: 'image', label: 'Фото', type: 'image' },
      { key: 'image3d', label: '3D-модель', type: 'text', placeholder: '/models/printer.glb' },
      {
        key: 'characteristics',
        label: 'Характеристики',
        type: 'specs',
        placeholder: '## Печать\nОбласть печати: 220 × 220 × 250 мм\nМатериалы: PLA, PETG',
        hint: 'Строка «## Раздел» начинает раздел, дальше строки «Подпись: значение»',
      },
      { key: 'isOpen', label: 'Работает', type: 'checkbox', hint: 'без галочки бронировать нельзя' },
    ],
  },
  {
    id: 'courses',
    label: 'Курсы',
    endpoint: '/courses',
    title: (item) => item.title,
    meta: (item) => `${item.Institution?.name ?? ''} · мест ${item.availableSpots} из ${item.totalSpots}`,
    addLabel: 'Курс',
    fields: [
      { key: 'institutionId', label: 'Учреждение', type: 'institution', required: true },
      { key: 'title', label: 'Название', type: 'text', required: true },
      { key: 'direction', label: 'Направление', type: 'text', required: true, placeholder: 'IT-куб' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'totalSpots', label: 'Мест всего', type: 'number', required: true },
    ],
  },
  {
    id: 'specialists',
    label: 'Эксперты',
    endpoint: '/specialists',
    title: (item) => item.name,
    meta: (item) => `${item.position ?? ''} · ${item.Institution?.name ?? ''}`,
    addLabel: 'Эксперт',
    fields: [
      { key: 'institutionId', label: 'Учреждение', type: 'institution', required: true },
      { key: 'name', label: 'Имя и фамилия', type: 'text', required: true },
      { key: 'position', label: 'Должность или специализация', type: 'text' },
      { key: 'avatar', label: 'Фото', type: 'image' },
      { key: 'isAvailable', label: 'Принимает заявки на консультации', type: 'checkbox' },
    ],
  },
  {
    id: 'posts',
    label: 'Посты',
    endpoint: '/posts',
    title: (item) => item.title,
    meta: (item) =>
      `${item.isFeatured ? 'Актуальное · ' : ''}${new Date(item.publishedAt).toLocaleDateString('ru-RU')} · ♥ ${item.likes}`,
    addLabel: 'Пост',
    fields: [
      { key: 'title', label: 'Заголовок', type: 'text', required: true },
      { key: 'text', label: 'Текст', type: 'textarea', required: true },
      { key: 'image', label: 'Картинка', type: 'image' },
      { key: 'isFeatured', label: 'В «Актуальное»', type: 'checkbox', hint: 'крупная карточка в карусели на главной' },
    ],
  },
]

/** Справочник: учреждения, оборудование, курсы, эксперты, посты */
export default function CatalogTab() {
  const [sectionId, setSectionId] = useState(SECTIONS[0].id)
  const section = SECTIONS.find((item) => item.id === sectionId) ?? SECTIONS[0]

  return (
    <>
      <div className={`${ui.tabs} ${styles.subTabs}`} role="tablist">
        {[...SECTIONS, { id: 'demo', label: 'Демо-данные' }].map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={sectionId === item.id}
            className={`${ui.tab} ${sectionId === item.id ? ui.tabActive : ''}`}
            onClick={() => setSectionId(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {sectionId === 'demo' ? <DemoCleanup /> : <SectionList key={section.id} section={section} />}
    </>
  )
}

function SectionList({ section }: { section: Section }) {
  const [items, setItems] = useState<any[] | null>(null)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<string | 'new' | null>(null)

  const load = useCallback(() => {
    api
      .get<any[]>(section.endpoint)
      .then((response) => setItems(response.data))
      .catch(() => setItems([]))
  }, [section.endpoint])

  useEffect(() => {
    load()
  }, [load])

  const needle = query.trim().toLowerCase()
  const visible = (items ?? []).filter(
    (item) => !needle || `${section.title(item)} ${section.meta(item)}`.toLowerCase().includes(needle),
  )

  const saved = () => {
    setEditing(null)
    if (section.id === 'institutions') resetInstitutionsCache()
    load()
  }

  return (
    <>
      <div className={styles.filters}>
        <input
          className={ui.input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск"
          aria-label={`Поиск: ${section.label}`}
        />
        <button className={ui.primary} onClick={() => setEditing(editing === 'new' ? null : 'new')}>
          + {section.addLabel}
        </button>
      </div>

      {editing === 'new' && (
        <EntityForm section={section} item={null} onDone={saved} onCancel={() => setEditing(null)} />
      )}

      {items === null ? (
        <div className="bigLoader" />
      ) : visible.length === 0 ? (
        <div className={ui.empty}>{items.length ? 'Ничего не нашлось' : 'Пока пусто'}</div>
      ) : (
        <div className={ui.list}>
          {visible.map((item) => (
            <div key={item.id} className={styles.bookingItem}>
              <div className={`${ui.card} ${styles.row}`}>
                <div className={ui.cardBody}>
                  <span className={ui.cardTitle}>{section.title(item)}</span>
                  <span className={ui.cardMeta}>{section.meta(item)}</span>
                </div>
                <button
                  className={`${ui.ghost} ${ui.small}`}
                  onClick={() => setEditing(editing === item.id ? null : item.id)}
                  aria-expanded={editing === item.id}
                >
                  {editing === item.id ? 'Скрыть' : 'Изменить'}
                </button>
              </div>
              {editing === item.id && (
                <EntityForm section={section} item={item} onDone={saved} onCancel={() => setEditing(null)} />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function EntityForm({
  section,
  item,
  onDone,
  onCancel,
}: {
  section: Section
  item: any | null
  onDone: () => void
  onCancel: () => void
}) {
  const toast = useToast()
  const [values, setValues] = useState<Values>(() => fromItem(section.fields, item))
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const missing = section.fields.find(
      (field) => field.required && (values[field.key] === '' || values[field.key] == null),
    )
    if (missing) {
      toast.error(`Заполните поле «${missing.label}»`)
      return
    }

    setSaving(true)
    try {
      const payload = toPayload(section.fields, values)
      if (item) await api.put(`${section.endpoint}/${item.id}`, payload)
      else await api.post(section.endpoint, payload)
      toast.success('Сохранено')
      onDone()
    } catch (error) {
      const details = error instanceof ApiError ? error.data?.details?.join(', ') : ''
      toast.error(
        error instanceof ApiError ? `${error.message}${details ? `: ${details}` : ''}` : 'Не удалось сохранить',
      )
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!item || !window.confirm(`Удалить «${section.title(item)}»?`)) return
    try {
      await api.delete(`${section.endpoint}/${item.id}`)
      toast.success('Удалено')
      onDone()
    } catch (error) {
      if (error instanceof ApiError && error.data?.code === 'HAS_ENROLLMENTS' && window.confirm(error.message)) {
        await api.delete(`${section.endpoint}/${item.id}?force=true`)
        toast.success('Курс удалён')
        onDone()
        return
      }
      toast.error(error instanceof ApiError ? error.message : 'Не удалось удалить')
    }
  }

  return (
    <div className={`${ui.panel} ${styles.bookingDetails}`}>
      <form className={styles.entityForm} onSubmit={submit}>
        {section.fields.map((field) => (
          <Field
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
          />
        ))}
        <div className={styles.formActions}>
          {item && (
            <button type="button" className={`${ui.danger} ${ui.small}`} onClick={remove}>
              Удалить
            </button>
          )}
          <span className={styles.spacer} />
          <button type="button" className={`${ui.ghost} ${ui.small}`} onClick={onCancel}>
            Отмена
          </button>
          <button type="submit" className={`${ui.primary} ${ui.small}`} disabled={saving}>
            {saving ? 'Сохраняем...' : item ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>

      {section.id === 'courses' && item && <CourseContentEditor courseId={item.id} />}
    </div>
  )
}

interface DemoPreview {
  posts: string[]
  specialists: string[]
  equipment: string[]
  keptEquipment: string[]
}

/** Демо-наполнение сида: показать, что уйдёт, и убрать одной кнопкой */
function DemoCleanup() {
  const toast = useToast()
  const [preview, setPreview] = useState<DemoPreview | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () =>
    api
      .get<DemoPreview>('/admin/demo')
      .then((response) => setPreview(response.data))
      .catch(() => setPreview({ posts: [], specialists: [], equipment: [], keptEquipment: [] }))

  useEffect(() => {
    load()
  }, [])

  if (!preview) return <div className="bigLoader" />
  const total = preview.posts.length + preview.specialists.length + preview.equipment.length

  const remove = async () => {
    if (!window.confirm('Удалить демо-посты, вымышленных экспертов и демо-оборудование? Вернуть нельзя.')) return
    setBusy(true)
    try {
      await api.post('/admin/demo/remove')
      toast.success('Демо-данные удалены')
      load()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не получилось')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`${ui.panel} ${styles.bookingDetails}`}>
      <p className={styles.reportLine}>
        При первом запуске сайт наполнили примерами, чтобы он не был пустым. Когда появятся настоящие посты и эксперты,
        примеры можно убрать. Учреждения, курсы и оборудование из справочника моделей не затрагиваются.
      </p>
      {total === 0 ? (
        <div className={ui.empty}>Демо-данных не осталось</div>
      ) : (
        <>
          <DemoList title="Посты" items={preview.posts} />
          <DemoList title="Эксперты (заявки к ним тоже удалятся)" items={preview.specialists} />
          <DemoList title="Оборудование" items={preview.equipment} />
          {preview.keptEquipment.length > 0 && (
            <p className={ui.muted}>Останутся, потому что на них есть брони: {preview.keptEquipment.join(', ')}</p>
          )}
          <button className={`${ui.danger} ${styles.left}`} onClick={remove} disabled={busy}>
            {busy ? 'Удаляем...' : `Удалить демо-данные (${total})`}
          </button>
        </>
      )}
    </div>
  )
}

function DemoList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <span className={ui.label}>{title}</span>
      <ul className={styles.demoList}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
