'use client'

import React from 'react'
import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className={styles.container}>
          <div className={styles.content}>
            <h1 className={styles.title}>Что-то пошло не так</h1>
            <p className={styles.message}>
              {this.state.error?.message || 'Произошла ошибка при загрузке страницы'}
            </p>
            <button
              className={styles.button}
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
            >
              Вернуться на главную
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
