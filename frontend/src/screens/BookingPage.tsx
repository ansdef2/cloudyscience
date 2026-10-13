'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import ProtoCalendar from '@/components/ProtoCalendar'
import AuthGate from '@/components/AuthGate'
import { createBooking } from '@/services/bookingService'
import { Availability, getAvailability, getEquipmentById } from '@/services/equipmentService'
import { getMyTeams, Team } from '@/services/teamService'
import {
  BOOKING_FILE_ACCEPT,
  BOOKING_FILE_MAX_MB,
  BOOKING_FILES_MAX,
  deleteUpload,
  formatSize,
  uploadBookingFile,
} from '@/services/uploadService'
import { ApiError } from '@/utils/api'
import { useToast } from '@/hooks/useToast'
import styles from './BookingPage.module.css'

interface BookingPageProps {
  equipmentId: string
}

const STEPS = [
  { id: 'files', label: 'Файлы' },
  { id: 'time', label: 'Время' },
  { id: 'confirm', label: 'Подтверждение' },
] as const

type Step = (typeof STEPS)[number]['id']

interface PickedFile {
  key: string
  name: string
  size: number
  progress: number
  id?: string
  error?: string
}

const ACCEPTED = BOOKING_FILE_ACCEPT.split(',')

const formatDay = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })

export default function BookingPage({ equipmentId }: BookingPageProps) {
  return (
    <div className={`${styles.container} protoPage`}>
      <ProtoTopBar />
      <div className={styles.content}>
        <AuthGate reason="Войдите, чтобы забронировать оборудование">
          {() => <BookingWizard equipmentId={equipmentId} />}
        </AuthGate>
      </div>
    </div>
  )
}

function BookingWizard({ equipmentId }: BookingPageProps) {
  const router = useRouter()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('files')
  const [files, setFiles] = useState<PickedFile[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [view, setView] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [bounds, setBounds] = useState<{ today: string; lastDate: string; closed?: boolean } | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [rentalType, setRentalType] = useState<'remote' | 'in-person'>('remote')
  const [equipmentName, setEquipmentName] = useState('Оборудование')
  const [equipmentAddress, setEquipmentAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)

  // Команды пользователя — чтобы забронировать на команду, а не на себя
  useEffect(() => {
    getMyTeams()
      .then(setTeams)
      .catch(() => setTeams([]))
  }, [])

  useEffect(() => {
    getEquipmentById(equipmentId).then((equipment) => {
      if (equipment) {
        setEquipmentName(equipment.name)
        setEquipmentAddress(equipment.address)
      }
    })
    // Границы календаря — по времени площадки: сервер знает, какое там «сегодня»
    getAvailability(equipmentId)
      .then((data) => setBounds({ today: data.today, lastDate: data.lastDate, closed: data.closed }))
      .catch(() => setBounds(null))
  }, [equipmentId])

  const loadSlots = (date: string) => {
    setLoadingSlots(true)
    getAvailability(equipmentId, date)
      .then(setAvailability)
      .catch(() => setAvailability(null))
      .finally(() => setLoadingSlots(false))
  }

  const pickDate = (date: string) => {
    setSelectedDate(date)
    setSelectedTime(null)
    loadSlots(date)
  }

  // ── Файлы ──────────────────────────────────────────────────────────────

  const updateFile = (key: string, patch: Partial<PickedFile>) =>
    setFiles((current) => current.map((file) => (file.key === key ? { ...file, ...patch } : file)))

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return
    const room = BOOKING_FILES_MAX - files.length
    if (room <= 0) {
      toast.error(`Не больше ${BOOKING_FILES_MAX} файлов к одной брони`)
      return
    }

    const picked = Array.from(list).slice(0, room)
    if (list.length > room) toast.error(`Добавлены первые ${room}: к брони — не больше ${BOOKING_FILES_MAX} файлов`)

    const queue = picked.map((file) => {
      const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
      const error = !ACCEPTED.includes(extension)
        ? 'Такой тип файла не принимается'
        : file.size > BOOKING_FILE_MAX_MB * 1024 * 1024
          ? `Больше ${BOOKING_FILE_MAX_MB} МБ`
          : undefined
      return { file, entry: { key: `${file.name}-${file.size}-${Math.random()}`, name: file.name, size: file.size, progress: 0, error } }
    })
    setFiles((current) => [...current, ...queue.map((item) => item.entry)])

    // По одному: так видно, какой файл грузится, и не забивается канал
    for (const { file, entry } of queue) {
      if (entry.error) continue
      try {
        const uploaded = await uploadBookingFile(file, (share) => updateFile(entry.key, { progress: share }))
        updateFile(entry.key, { id: uploaded.id, progress: 1 })
      } catch (error) {
        updateFile(entry.key, { error: error instanceof ApiError ? error.message : 'Не загрузился' })
      }
    }
  }

  const removeFile = (file: PickedFile) => {
    setFiles((current) => current.filter((item) => item.key !== file.key))
    if (file.id) deleteUpload(file.id).catch(() => undefined)
  }

  const uploading = files.some((file) => !file.id && !file.error)
  const readyFiles = files.filter((file) => file.id)

  // ── Шаги ──────────────────────────────────────────────────────────────

  const handleNext = () => {
    if (step === 'files') {
      if (uploading) {
        toast.error('Дождитесь, пока загрузятся файлы')
        return
      }
      setStep('time')
      return
    }

    if (step === 'time') {
      if (!selectedDate || !selectedTime) {
        toast.error('Выберите дату и время')
        return
      }
      setStep('confirm')
    }
  }

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Выберите дату и время')
      return
    }

    setIsSubmitting(true)

    try {
      await createBooking({
        equipmentId,
        date: selectedDate,
        time: selectedTime,
        rentalType,
        teamId: teamId ?? undefined,
        fileIds: readyFiles.map((file) => file.id!),
        location: rentalType === 'in-person' ? equipmentAddress : undefined,
        notes: notes.trim() || undefined,
      })

      toast.success('Бронь отправлена — администратор подтвердит её')
      router.push('/profile')
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        // Пока человек подтверждал, слот заняли — возвращаем к выбору времени
        toast.error('Это время только что заняли — выберите другое')
        setSelectedTime(null)
        setStep('time')
        loadSlots(selectedDate)
      } else {
        toast.error(error instanceof ApiError ? error.message : 'Не удалось создать бронирование')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const freeSlots = availability?.slots.filter((slot) => slot.available) ?? []

  return (
    <>
      <div className={styles.steps}>
        {STEPS.map((item, index) => (
          <div key={item.id} className={`${styles.step} ${step === item.id ? styles.stepActive : ''}`}>
            <span className={styles.stepNumber}>{index + 1}</span>
            <span className={styles.stepLabel}>{item.label}</span>
          </div>
        ))}
      </div>

      <h1 className={styles.title}>{equipmentName}</h1>

      {bounds?.closed && (
        <p className={styles.info}>Оборудование сейчас не принимает брони — загляните позже или выберите другое.</p>
      )}

      {step === 'files' && (
        <>
          <div className={styles.card}>
            <div className={`${styles.cardGlow} protoGlowHero`} />
            <h2 className={styles.sectionTitle}>Файлы для работы</h2>
            <p className={styles.sectionText}>
              Модели, G-код, чертежи — до {BOOKING_FILES_MAX} файлов по {BOOKING_FILE_MAX_MB} МБ. Их увидят только
              вы, ваша команда и администратор. Можно пропустить.
            </p>

            <div className={styles.stack}>
              {files.map((file) => (
                <div key={file.key} className={`${styles.fileItem} ${file.error ? styles.fileError : ''}`}>
                  <div className={styles.fileMain}>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>
                      {file.error ?? (file.id ? formatSize(file.size) : `${Math.round(file.progress * 100)}%`)}
                    </span>
                    {!file.id && !file.error && (
                      <span className={styles.progress} style={{ ['--share' as string]: file.progress }} />
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.fileRemove}
                    onClick={() => removeFile(file)}
                    aria-label={`Убрать ${file.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <input
                ref={fileInput}
                type="file"
                multiple
                accept={BOOKING_FILE_ACCEPT}
                hidden
                onChange={(event) => {
                  addFiles(event.target.files)
                  event.target.value = ''
                }}
              />
              <button
                type="button"
                className={styles.addFile}
                onClick={() => fileInput.current?.click()}
                disabled={files.length >= BOOKING_FILES_MAX}
              >
                + Добавить файлы
              </button>
            </div>
          </div>

          <div className={styles.card}>
            <div className={`${styles.cardGlow} protoGlowHero`} />
            <h2 className={styles.sectionTitle}>Тип аренды</h2>

            <div className={`${styles.stack} ${styles.rentalOptions}`}>
              <button
                className={`${styles.rentalButton} ${rentalType === 'remote' ? styles.rentalButtonActive : ''}`}
                onClick={() => setRentalType('remote')}
              >
                <span className={styles.rentalLabel}>Дистанционно</span>
                <span className={styles.rentalHint}>Работайте из дома</span>
              </button>
              <button
                className={`${styles.rentalButton} ${rentalType === 'in-person' ? styles.rentalButtonActive : ''}`}
                onClick={() => setRentalType('in-person')}
              >
                <span className={styles.rentalLabel}>Лично</span>
                <span className={styles.rentalHint}>Нужно прийти</span>
              </button>
            </div>
            <p className={styles.sectionText}>
              {rentalType === 'remote'
                ? 'После подтверждения администратор пришлёт в бронь, как подключиться к оборудованию.'
                : `Приходите по адресу: ${equipmentAddress || 'уточняется'}.`}
            </p>
          </div>

          <button className={styles.primary} onClick={handleNext} disabled={uploading}>
            {uploading ? 'Загружаем файлы...' : 'Далее'}
          </button>
        </>
      )}

      {step === 'time' && (
        <>
          <div className={styles.card}>
            <div className={`${styles.cardGlow} protoGlowHero`} />
            <h2 className={styles.sectionTitle}>Дата и время</h2>
            {rentalType === 'in-person' && (
              <p className={styles.sectionText}>📍 {equipmentAddress || 'Адрес уточняется'}</p>
            )}

            <div className={styles.stack}>
              <ProtoCalendar
                year={view.year}
                month={view.month}
                selected={selectedDate}
                onSelect={pickDate}
                minDate={bounds?.today}
                maxDate={bounds?.lastDate}
                onMonthChange={(year, month) => setView({ year, month })}
              />

              {!selectedDate ? (
                <p className={styles.slotHint}>Выберите день — покажем свободное время</p>
              ) : loadingSlots ? (
                <div className="bigLoader" />
              ) : !availability ? (
                <p className={styles.slotHint}>Не удалось загрузить расписание. Попробуйте ещё раз</p>
              ) : (
                <>
                  <p className={styles.slotHint}>
                    {formatDay(selectedDate)} · работает {availability.workingHours.start}–
                    {availability.workingHours.end}
                  </p>
                  <div className={styles.timeList}>
                    {availability.slots.map((slot) => (
                      <button
                        key={slot.time}
                        className={`${styles.timeChip} ${selectedTime === slot.time ? styles.timeChipActive : ''} ${
                          slot.status === 'taken' ? styles.timeChipTaken : ''
                        }`}
                        onClick={() => setSelectedTime(slot.time)}
                        disabled={!slot.available}
                        title={slot.status === 'taken' ? 'Занято' : slot.status === 'past' ? 'Время прошло' : undefined}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                  {freeSlots.length === 0 && (
                    <p className={styles.slotHint}>На этот день свободного времени нет — выберите другой</p>
                  )}
                </>
              )}
            </div>

            <p className={styles.info}>Бронь — на час. Нужно дольше — забронируйте несколько часов подряд.</p>
          </div>

          <div className={styles.actions}>
            <button className={styles.secondary} onClick={() => setStep('files')}>
              Назад
            </button>
            <button className={styles.primary} onClick={handleNext}>
              Далее
            </button>
          </div>
        </>
      )}

      {step === 'confirm' && (
        <>
          <div className={styles.card}>
            <div className={`${styles.cardGlow} protoGlowHero`} />
            <h2 className={styles.sectionTitle}>Подтверждение</h2>

            <div className={styles.stack}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Оборудование</span>
                <span>{equipmentName}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Дата</span>
                <span>{selectedDate && formatDay(selectedDate)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Время</span>
                <span>{selectedTime}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Тип</span>
                <span>{rentalType === 'remote' ? 'Дистанционно' : 'Лично'}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Файлы</span>
                <span>{readyFiles.length || 'нет'}</span>
              </div>
              {teams.length > 0 && (
                <div className={styles.owner}>
                  <span className={styles.summaryLabel}>Для кого</span>
                  <div className={styles.ownerChoices}>
                    <button
                      className={`${styles.ownerChip} ${teamId === null ? styles.ownerChipActive : ''}`}
                      onClick={() => setTeamId(null)}
                      aria-pressed={teamId === null}
                    >
                      Для себя
                    </button>
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        className={`${styles.ownerChip} ${teamId === team.id ? styles.ownerChipActive : ''}`}
                        onClick={() => setTeamId(team.id)}
                        aria-pressed={teamId === team.id}
                      >
                        Команда «{team.name}»
                      </button>
                    ))}
                  </div>
                  {teamId && <span className={styles.ownerHint}>Бронь и файлы увидят все участники команды</span>}
                </div>
              )}
              <label className={styles.notes}>
                <span className={styles.summaryLabel}>Комментарий для администратора</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={1000}
                  placeholder="Например: печать PLA, нужен подогрев стола"
                />
              </label>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.secondary} onClick={() => setStep('time')}>
              Назад
            </button>
            <button className={styles.primary} onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? 'Отправляем...' : 'Забронировать'}
            </button>
          </div>
        </>
      )}
    </>
  )
}
