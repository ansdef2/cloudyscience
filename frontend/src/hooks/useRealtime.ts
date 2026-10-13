import { useEffect, useRef, useState } from 'react'
import { onConnectionChange, RealtimeEvent, subscribe } from '@/utils/realtime'

/** Слушать живые события; listener может меняться без переподписки */
export function useRealtime(listener: (event: RealtimeEvent) => void, enabled = true) {
  const ref = useRef(listener)
  ref.current = listener

  useEffect(() => {
    if (!enabled) return
    return subscribe((event) => ref.current(event))
  }, [enabled])
}

/** Есть ли сейчас живое соединение — чтобы реже опрашивать API */
export function useRealtimeConnected() {
  const [connected, setConnected] = useState(false)
  useEffect(() => onConnectionChange(setConnected), [])
  return connected
}
