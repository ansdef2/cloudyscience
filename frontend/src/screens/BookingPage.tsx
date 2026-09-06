'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import ProtoCalendar from '@/components/ProtoCalendar'
import { createBooking } from '@/services/bookingService'
import { getEquipmentById } from '@/services/equipmentService'
import { useToast } from '@/hooks/useToast'
import styles from './BookingPage.module.css'

interface BookingPageProps {
  equipmentId: string
}

const AVAILABLE_TIMES = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']

// Список файлов пока фиксированный: файлового хранилища в API ещё нет
const SAMPLE_FILES = ['project.gcode', 'model.stl', 'config.json', 'texture.png']

const STEPS = [
  { id: 'files', label: 'Файлы' },
  { id: 'time', label: 'Время' },
  { id: 'confirm', label: 'Подтверждение' },
] as const

type Step = (typeof STEPS)[number]['id']

export default function BookingPage({ equipmentId }: BookingPageProps) {
  const router = useRouter()
  const toast = useToast()

  const [step, setStep] = useState<Step>('files')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [rentalType, setRentalType] = useState<'remote' | 'in-person'>('remote')
  const [equipmentName, setEquipmentName] = useState('Оборудование')
  const [equipmentAddress, setEquipmentAddress] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    getEquipmentById(equipmentId).then((equipment) => {
      if (equipment) {
        setEquipmentName(equipment.name)
        setEquipmentAddress(equipment.address)
      }
    })
  }, [equipmentId])

  const handleNext = () => {
    if (step === 'files') {
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
        files: selectedFiles,
        location: rentalType === 'in-person' ? equipmentAddress : undefined,
      })

      toast.success('Бронирование создано')
      router.push('/equipment')
    } catch {
      toast.error('Не удалось создать бронирование')
    } finally {
      setIsSubmitting(false)
    }
  }

  const now = new Date()

  return (
    <div className={styles.container}>
      <ProtoTopBar />

      <div className={styles.content}>
        <div className={styles.steps}>
          {STEPS.map((item, index) => (
            <div
              key={item.id}
              className={`${styles.step} ${step === item.id ? styles.stepActive : ''}`}
            >
              <span className={styles.stepNumber}>{index + 1}</span>
              <span className={styles.stepLabel}>{item.label}</span>
            </div>
          ))}
        </div>

        <h1 className={styles.title}>{equipmentName}</h1>

        {step === 'files' && (
          <>
            <div className={styles.card}>
              <div className={`${styles.cardGlow} protoGlowHero`} />
              <h2 className={styles.sectionTitle}>Файлы для загрузки на машину</h2>
              <p className={styles.sectionText}>
                Загрузятся автоматически за час до начала сессии
              </p>

              <div className={styles.stack}>
                {SAMPLE_FILES.map((file) => (
                  <label key={file} className={styles.fileItem}>
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file)}
                      onChange={(event) =>
                        setSelectedFiles(
                          event.target.checked
                            ? [...selectedFiles, file]
                            : selectedFiles.filter((name) => name !== file)
                        )
                      }
                    />
                    {file}
                    <span className={styles.fileSize}>2.4 MB</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <div className={`${styles.cardGlow} protoGlowHero`} />
              <h2 className={styles.sectionTitle}>Тип аренды</h2>

              <div className={`${styles.stack} ${styles.rentalOptions}`}>
                <button
                  className={`${styles.rentalButton} ${
                    rentalType === 'remote' ? styles.rentalButtonActive : ''
                  }`}
                  onClick={() => setRentalType('remote')}
                >
                  <span className={styles.rentalLabel}>Дистанционно</span>
                  <span className={styles.rentalHint}>Работайте из дома</span>
                </button>
                <button
                  className={`${styles.rentalButton} ${
                    rentalType === 'in-person' ? styles.rentalButtonActive : ''
                  }`}
                  onClick={() => setRentalType('in-person')}
                >
                  <span className={styles.rentalLabel}>Лично</span>
                  <span className={styles.rentalHint}>Нужно прийти</span>
                </button>
              </div>
            </div>

            <button className={styles.primary} onClick={handleNext}>
              Далее
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
                  year={now.getFullYear()}
                  month={now.getMonth() + 1}
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                />

                <div className={styles.timeList}>
                  {AVAILABLE_TIMES.map((time) => (
                    <button
                      key={time}
                      className={`${styles.timeChip} ${
                        selectedTime === time ? styles.timeChipActive : ''
                      }`}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <p className={styles.info}>
                ⏰ Файлы загрузятся на машину за час до начала сессии
              </p>
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
                  <span>{selectedDate}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Время</span>
                  <span>{selectedTime}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Тип</span>
                  <span>{rentalType === 'remote' ? 'Дистанционно' : 'Лично'}</span>
                </div>
                {selectedFiles.length > 0 && (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Файлы</span>
                    <span>{selectedFiles.length}</span>
                  </div>
                )}
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
      </div>
    </div>
  )
}
