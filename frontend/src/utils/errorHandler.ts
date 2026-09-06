// Утилита для обработки ошибок

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const handleError = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return 'Произошла неизвестная ошибка'
}

export const logError = (error: unknown, context?: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error${context ? ` in ${context}` : ''}]:`, error)
  }
  // В продакшене здесь можно отправлять ошибки в систему мониторинга
}
