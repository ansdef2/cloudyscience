'use client'

import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { fileUrl, IMAGE_ACCEPT, uploadImage } from '@/services/uploadService'
import { api, ApiError } from '@/utils/api'
import ui from '@/styles/ui.module.css'
import styles from '../AdminPage.module.css'

export type FieldType = 'text' | 'textarea' | 'number' | 'checkbox' | 'institution' | 'image' | 'specs' | 'lines'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  hint?: string
}

export type Values = Record<string, any>

interface SpecSection {
  section: string
  rows: { label: string; value: string }[]
}

/**
 * Характеристики оборудования — текстом, который легко править:
 *   ## Раздел
 *   Подпись: значение
 */
export const specsToText = (value: unknown) => {
  if (!Array.isArray(value)) return ''
  return (value as SpecSection[])
    .map((section) =>
      [
        section.section ? `## ${section.section}` : '',
        ...(section.rows ?? []).map((row) => `${row.label}: ${row.value}`),
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n')
}

export const textToSpecs = (text: string): SpecSection[] => {
  const sections: SpecSection[] = []
  let current: SpecSection | null = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('##')) {
      current = { section: line.replace(/^#+\s*/, ''), rows: [] }
      sections.push(current)
      continue
    }
    if (!current) {
      current = { section: '', rows: [] }
      sections.push(current)
    }
    const colon = line.indexOf(':')
    current.rows.push(
      colon > 0
        ? { label: line.slice(0, colon).trim(), value: line.slice(colon + 1).trim() }
        : { label: line, value: '' },
    )
  }
  return sections
}

let institutionsCache: Promise<{ id: string; name: string }[]> | null = null
const loadInstitutions = () => {
  institutionsCache ??= api
    .get<{ id: string; name: string }[]>('/institutions')
    .then((response) => response.data)
    .catch(() => [])
  return institutionsCache
}
export const resetInstitutionsCache = () => {
  institutionsCache = null
}

function InstitutionSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [items, setItems] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    loadInstitutions().then(setItems)
  }, [])
  return (
    <select className={ui.select} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
      <option value="">— выберите учреждение —</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  )
}

function ImageField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      const uploaded = await uploadImage(file)
      onChange(uploaded.url ?? '')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось загрузить картинку')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.imageField}>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.imagePreview} src={fileUrl(value)} alt="" />
      ) : (
        <span className={styles.imagePreview} aria-hidden />
      )}
      <div className={styles.imageControls}>
        <input
          className={ui.input}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/equipment/photo.jpg или загрузите"
        />
        <input
          ref={input}
          type="file"
          accept={IMAGE_ACCEPT}
          hidden
          onChange={(event) => {
            pick(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <button
          type="button"
          className={`${ui.ghost} ${ui.small}`}
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          {busy ? 'Загружаем...' : 'Загрузить картинку'}
        </button>
      </div>
    </div>
  )
}

/** Поле формы по описанию */
export function Field({ field, value, onChange }: { field: FieldDef; value: any; onChange: (value: any) => void }) {
  let control
  switch (field.type) {
    case 'textarea':
    case 'lines':
    case 'specs':
      control = (
        <textarea
          className={`${ui.textarea} ${field.type === 'specs' ? styles.mono : ''}`}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          rows={field.type === 'textarea' ? 4 : 6}
        />
      )
      break
    case 'number':
      control = (
        <input
          className={ui.input}
          type="number"
          step="any"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
        />
      )
      break
    case 'checkbox':
      return (
        <label className={styles.check}>
          <input type="checkbox" checked={!!value} onChange={(event) => onChange(event.target.checked)} />
          <span>{field.label}</span>
          {field.hint && <span className={ui.muted}> — {field.hint}</span>}
        </label>
      )
    case 'institution':
      control = <InstitutionSelect value={value} onChange={onChange} />
      break
    case 'image':
      control = <ImageField value={value} onChange={onChange} />
      break
    default:
      control = (
        <input
          className={ui.input}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
        />
      )
  }

  return (
    <label className={ui.field}>
      <span className={ui.label}>
        {field.label}
        {field.required && ' *'}
      </span>
      {control}
      {field.hint && <span className={styles.hint}>{field.hint}</span>}
    </label>
  )
}

/** Значения формы → тело запроса: числа, списки строк, характеристики */
export const toPayload = (fields: FieldDef[], values: Values) => {
  const payload: Values = {}
  for (const field of fields) {
    const value = values[field.key]
    switch (field.type) {
      case 'number':
        payload[field.key] = value === '' || value == null ? null : Number(value)
        break
      case 'checkbox':
        payload[field.key] = !!value
        break
      case 'specs':
        payload[field.key] = textToSpecs(String(value ?? ''))
        break
      case 'lines':
        payload[field.key] = String(value ?? '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
        break
      default:
        payload[field.key] = typeof value === 'string' ? value.trim() : (value ?? null)
    }
  }
  return payload
}

/** Запись из API → значения формы */
export const fromItem = (fields: FieldDef[], item: Values | null) => {
  const values: Values = {}
  for (const field of fields) {
    const value = item?.[field.key]
    if (field.type === 'specs') values[field.key] = specsToText(value)
    else if (field.type === 'lines') values[field.key] = Array.isArray(value) ? value.join('\n') : ''
    else if (field.type === 'checkbox') values[field.key] = item ? !!value : true
    else values[field.key] = value ?? ''
  }
  return values
}
