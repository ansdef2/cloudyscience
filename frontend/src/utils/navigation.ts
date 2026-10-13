/** Главный экран приложения: карта, поиск, курсы. Лендинг живёт на «/» */
export const APP_HOME = '/home'

/** Куда вернуть после входа: ?next=/course/… или главный экран приложения */
export const afterAuthPath = () => {
  if (typeof window === 'undefined') return APP_HOME
  const next = new URLSearchParams(window.location.search).get('next')
  // Только свои пути: //evil.example — это уже чужой сайт
  return next && next.startsWith('/') && !next.startsWith('//') ? next : APP_HOME
}

/** Ссылка на вход с возвратом на текущую страницу */
export const loginPathFromHere = () =>
  typeof window === 'undefined'
    ? '/login'
    : `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`
