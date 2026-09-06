'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import styles from './PostRentalPage.module.css'

export default function PostRentalPage() {
  const router = useRouter()
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [action, setAction] = useState<'save' | 'delete' | null>(null)

  const sessionFiles = [
    { name: 'output.gcode', size: '3.2 MB', modified: '2025-01-15 16:30', changed: true },
    { name: 'result.stl', size: '5.8 MB', modified: '2025-01-15 16:25', changed: true },
    { name: 'log.txt', size: '0.1 MB', modified: '2025-01-15 16:20', changed: false },
    { name: 'config.json', size: '0.1 MB', modified: '2025-01-15 16:15', changed: false },
  ]

  const handleFileSelect = (fileName: string) => {
    if (selectedFiles.includes(fileName)) {
      setSelectedFiles(selectedFiles.filter(f => f !== fileName))
    } else {
      setSelectedFiles([...selectedFiles, fileName])
    }
  }

  const handleSave = () => {
    if (selectedFiles.length === 0) {
      alert('Выберите файлы для сохранения')
      return
    }
    alert(`Файлы сохранены: ${selectedFiles.join(', ')}`)
    router.push('/equipment')
  }

  const handleDelete = () => {
    if (selectedFiles.length === 0) {
      alert('Выберите файлы для удаления')
      return
    }
    if (confirm(`Удалить выбранные файлы? Изменения будут отменены.`)) {
      alert('Файлы удалены')
      router.push('/equipment')
    }
  }

  return (
    <div className={styles.container}>
      <Header showBack />
      
      <div className={styles.content}>
        <h1 className={styles.title}>Конец аренды</h1>
        <p className={styles.subtitle}>Выберите действия с файлами сессии</p>

        <div className={styles.options}>
          <div className={styles.optionCard}>
            <h3 className={styles.optionTitle}>Выбор файлов для сохранения в приложении</h3>
            <p className={styles.optionDescription}>
              Выберите все или определённые файлы, изменённые после сессии и сохраните их
            </p>
            <button 
              className={styles.optionButton}
              onClick={() => setAction('save')}
            >
              Сохранить файлы сессии
            </button>
          </div>

          <div className={styles.optionCard}>
            <h3 className={styles.optionTitle}>Удалить файлы после сессии</h3>
            <p className={styles.optionDescription}>
              Отменить изменения, внесённые в проект во время конкретной сессии
            </p>
            <button 
              className={styles.optionButton}
              onClick={() => setAction('delete')}
            >
              Удалить файлы после сессии
            </button>
          </div>

          <div className={styles.optionCard}>
            <h3 className={styles.optionTitle}>Загрузка файлов в облако</h3>
            <p className={styles.optionDescription}>
              Если устройство с дистанционным управлением
            </p>
            <button className={styles.optionButton}>
              Загрузить в облако
            </button>
          </div>

          <div className={styles.optionCard}>
            <h3 className={styles.optionTitle}>Загрузка файлов на своё устройство</h3>
            <p className={styles.optionDescription}>
              Если необходимо
            </p>
            <button className={styles.optionButton}>
              Скачать на устройство
            </button>
          </div>
        </div>

        {action && (
          <div className={styles.fileSelection}>
            <h2 className={styles.selectionTitle}>
              {action === 'save' ? 'Выберите файлы для сохранения' : 'Выберите файлы для удаления'}
            </h2>
            
            <div className={styles.fileList}>
              {sessionFiles.map((file) => (
                <label key={file.name} className={styles.fileItem}>
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.name)}
                    onChange={() => handleFileSelect(file.name)}
                  />
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileMeta}>
                      {file.size} • {file.modified}
                      {file.changed && <span className={styles.changed}>изменён</span>}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            <div className={styles.actions}>
              <button 
                className={styles.cancelButton}
                onClick={() => {
                  setAction(null)
                  setSelectedFiles([])
                }}
              >
                Отмена
              </button>
              <button 
                className={styles.confirmButton}
                onClick={action === 'save' ? handleSave : handleDelete}
              >
                {action === 'save' ? 'Сохранить' : 'Удалить'}
              </button>
            </div>
          </div>
        )}

        <div className={styles.infoBox}>
          <p className={styles.infoText}>
            ⚠️ Автоматическое удаление всех файлов проекта с машины произойдёт в течение часа после сессии для подготовки к новой аренде
          </p>
        </div>
      </div>
    </div>
  )
}
