'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import styles from './FileSystemPage.module.css'

export default function FileSystemPage() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const files = [
    { name: 'project.gcode', size: '2.4 MB', modified: '2025-01-15 14:30', type: 'file' },
    { name: 'models', size: '15.2 MB', modified: '2025-01-15 12:00', type: 'folder' },
    { name: 'textures', size: '8.7 MB', modified: '2025-01-14 18:45', type: 'folder' },
    { name: 'config.json', size: '0.1 MB', modified: '2025-01-15 10:20', type: 'file' },
    { name: 'output.stl', size: '5.3 MB', modified: '2025-01-15 16:00', type: 'file' },
  ]

  const handleFileSelect = (fileName: string) => {
    if (selectedFiles.includes(fileName)) {
      setSelectedFiles(selectedFiles.filter(f => f !== fileName))
    } else {
      setSelectedFiles([...selectedFiles, fileName])
    }
  }

  return (
    <div className={styles.container}>
      <Header showBack />
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Файловая система</h1>
          <div className={styles.actions}>
            <button className={styles.viewButton} onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}>
              {viewMode === 'list' ? '☰' : '⊞'}
            </button>
            <button className={styles.uploadButton}>
              📁 Загрузить файлы
            </button>
          </div>
        </div>

        <div className={styles.infoBox}>
          <h3 className={styles.infoTitle}>Преимущества файловой системы</h3>
          <ul className={styles.infoList}>
            <li>Позволяет удобно управлять файлами в проекте</li>
            <li>Можно легко загружать файлы на машины и экономить время</li>
            <li>Удобно обмениваться файлами с командой</li>
            <li>С программой для компьютера файлы будут всегда актуальными</li>
          </ul>
        </div>

        <div className={styles.toolbar}>
          <button className={styles.toolbarButton}>
            📥 Загрузить в облако
          </button>
          <button className={styles.toolbarButton}>
            📤 Скачать на устройство
          </button>
          {selectedFiles.length > 0 && (
            <button className={styles.toolbarButton}>
              🗑️ Удалить ({selectedFiles.length})
            </button>
          )}
        </div>

        <div className={`${styles.fileList} ${styles[viewMode]}`}>
          {files.map((file) => (
            <div
              key={file.name}
              className={`${styles.fileItem} ${
                selectedFiles.includes(file.name) ? styles.selected : ''
              }`}
              onClick={() => handleFileSelect(file.name)}
            >
              <div className={styles.fileIcon}>
                {file.type === 'folder' ? '📁' : '📄'}
              </div>
              <div className={styles.fileInfo}>
                <div className={styles.fileName}>{file.name}</div>
                <div className={styles.fileMeta}>
                  <span>{file.size}</span>
                  <span>•</span>
                  <span>{file.modified}</span>
                </div>
              </div>
              <div className={styles.fileActions}>
                <button className={styles.actionButton}>⋮</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
