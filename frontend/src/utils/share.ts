/**
 * Поделиться ссылкой: на телефоне — системное меню «Поделиться»
 * (мессенджеры, почта), на компьютере — копирование в буфер.
 * Возвращает, что произошло, чтобы показать подходящее уведомление.
 */
export async function shareLink(title: string, path: string): Promise<'shared' | 'copied' | 'failed'> {
  const url = `${window.location.origin}${path}`

  // Системное меню есть почти на всех телефонах; на компьютере — не везде
  if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title, url })
      return 'shared'
    } catch (error) {
      // Закрыл меню сам — это не ошибка и не повод копировать молча
      if (error instanceof DOMException && error.name === 'AbortError') return 'shared'
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    // Старые браузеры и не-HTTPS: копируем через скрытое поле
    const field = document.createElement('textarea')
    field.value = url
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    field.remove()
    return ok ? 'copied' : 'failed'
  }
}

export const postPath = (id: string) => `/post/${id}`
