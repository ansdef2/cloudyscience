'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import Supercluster from 'supercluster'
import 'maplibre-gl/dist/maplibre-gl.css'
import ImageWithFallback from '@/components/ImageWithFallback'
import { pluralize } from '@/utils/format'
import { buildMapStyle } from './mapStyle'
import styles from './MapWindow.module.css'

type MapLibre = typeof import('maplibre-gl')

/** Объект внутри учреждения: оборудование или курс */
export interface MapItem {
  id: string
  kind: 'equipment' | 'course'
  title: string
  caption?: string
  href: string
}

/** Учреждение на карте — точка, к которой привязаны объекты */
export interface MapPlace {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  href: string
  items: MapItem[]
}

interface LeafProps {
  placeId: string
  itemId: string
  /** Через запятую — какие учреждения попали в кластер */
  placeKey: string
}

type FeatureProps = LeafProps & Partial<Supercluster.ClusterProperties>

interface MapWindowProps {
  places: MapPlace[]
}

/** Большая Московская, между Кванториумом и ЦДО — пока учреждения не загрузились */
const DEFAULT_CENTER: [number, number] = [31.3065, 58.5112]
const DEFAULT_ZOOM = 13.4
/** Выше этого зума объекты одного здания не разойдутся — вместо зума открывается список */
const CLUSTER_MAX_ZOOM = 17
const CARD_RADIUS = 22
const EASE = 'cubic-bezier(0.22, 0.8, 0.24, 1)'

const KIND_LABEL: Record<MapItem['kind'], string> = {
  equipment: 'Оборудование',
  course: 'Курс',
}

const setInteractive = (map: MapLibreMap, enabled: boolean) => {
  const handlers = [map.dragPan, map.scrollZoom, map.doubleClickZoom, map.touchZoomRotate, map.keyboard, map.boxZoom]
  handlers.forEach((handler) => (enabled ? handler.enable() : handler.disable()))
  // Вращать незачем: на карте одна улица, а повёрнутая карта только путает
  map.touchZoomRotate.disableRotation()
}

const frame = (rect: { top: number; left: number; width: number; height: number }, radius: number) => ({
  top: `${rect.top}px`,
  left: `${rect.left}px`,
  width: `${rect.width}px`,
  height: `${rect.height}px`,
  borderRadius: `${radius}px`,
})

const viewport = () => ({ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight })

/**
 * Вид «все учреждения». На телефоне карточка низкая (126 px), поэтому
 * отступы в ней минимальные: при обычных 36 px две точки на Большой
 * Московской влезают только на зуме ~10.9, где кластеры уже сливаются.
 * На десктопе карточка высокая (440 px) — там поля просторнее.
 */
const fitToPlaces = (map: MapLibreMap, places: MapPlace[], expanded: boolean, duration = 0) => {
  if (!places.length) return
  const lngs = places.map((place) => place.longitude)
  const lats = places.map((place) => place.latitude)

  map.fitBounds(
    [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ],
    {
      // В полном экране поля шире — под подписи учреждений и плашку сверху
      padding: expanded
        ? { top: 150, bottom: 110, left: 110, right: 110 }
        : map.getContainer().clientHeight > 250
          ? { top: 70, bottom: 70, left: 110, right: 110 }
          : { top: 26, bottom: 26, left: 40, right: 64 },
      maxZoom: expanded ? 15.5 : 15,
      duration,
    }
  )
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Карта главного экрана. Свёрнута — карточка в ленте, как в макете:
 * кластеры видны, но карта не перехватывает прокрутку страницы, а тап
 * разворачивает её. Развёрнута — на весь экран, с жестами и списком
 * объектов по тапу на кластер.
 *
 * Карта создаётся один раз и при развороте не пересоздаётся: меняется
 * только позиционирование окна, а MapLibre сам подстраивает холст.
 */
export default function MapWindow({ places }: MapWindowProps) {
  const router = useRouter()
  const slotRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const mapRef = useRef<MapLibreMap | null>(null)
  const libRef = useRef<MapLibre | null>(null)
  const indexRef = useRef<Supercluster<LeafProps> | null>(null)
  const markersRef = useRef(new Map<string, Marker>())
  const placesRef = useRef<MapPlace[]>(places)
  const fittedRef = useRef(false)
  const animatingRef = useRef(false)
  const expandedRef = useRef(false)

  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [sheetPlaceIds, setSheetPlaceIds] = useState<string[] | null>(null)

  // Обработчик меняется каждый рендер, а маркеры создаются один раз — зовут его через ref
  const handleFeatureClickRef = useRef<(props: FeatureProps, at: [number, number]) => void>(() => {})
  const sheetOpenRef = useRef(false)
  sheetOpenRef.current = sheetPlaceIds !== null
  expandedRef.current = expanded

  /** Разложить маркеры кластеров под текущий вид карты */
  const renderMarkers = useCallback(() => {
    const map = mapRef.current
    const lib = libRef.current
    const index = indexRef.current
    if (!map || !lib) return

    const visible = new Set<string>()

    if (index) {
      const bounds = map.getBounds()
      const features = index.getClusters(
        [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        map.getZoom()
      )

      for (const feature of features) {
        const props = feature.properties as FeatureProps
        const key = props.cluster ? `cluster-${props.cluster_id}` : `item-${props.itemId}`
        visible.add(key)
        if (markersRef.current.has(key)) continue

        const element = createMarkerElement(props, placesRef.current)
        element.addEventListener('click', (event) => {
          event.stopPropagation()
          handleFeatureClickRef.current(props, feature.geometry.coordinates as [number, number])
        })

        const marker = new lib.Marker({ element, anchor: 'center' })
          .setLngLat(feature.geometry.coordinates as [number, number])
          .addTo(map)
        markersRef.current.set(key, marker)
      }
    }

    markersRef.current.forEach((marker, key) => {
      if (visible.has(key)) return
      marker.remove()
      markersRef.current.delete(key)
    })
  }, [])

  handleFeatureClickRef.current = (props, at) => {
    const map = mapRef.current
    const index = indexRef.current
    if (!map || !index) return

    if (!props.cluster) {
      setSheetPlaceIds([props.placeId])
      return
    }

    const placeIds = props.placeKey.split(',')
    const expansionZoom = index.getClusterExpansionZoom(props.cluster_id!)

    // Несколько учреждений в одном кластере — приблизить, пока они не разойдутся
    if (placeIds.length > 1 && expansionZoom <= CLUSTER_MAX_ZOOM) {
      map.easeTo({ center: at, zoom: expansionZoom + 0.3, duration: 450 })
      return
    }

    setSheetPlaceIds(placeIds)
  }

  // Карта создаётся один раз; библиотека грузится только в браузере
  useEffect(() => {
    let cancelled = false
    const markers = markersRef.current

    import('maplibre-gl')
      .then((lib) => {
        if (cancelled || !containerRef.current) return

        let map: MapLibreMap
        try {
          map = new lib.Map({
            container: containerRef.current,
            style: buildMapStyle(),
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            minZoom: 9,
            maxZoom: 19,
            attributionControl: false,
            dragRotate: false,
            pitchWithRotate: false,
            touchPitch: false,
            fadeDuration: 0,
          })
        } catch {
          // Нет WebGL — показываем статичную подложку из макета
          setFailed(true)
          return
        }

        map.addControl(new lib.AttributionControl({ compact: true }), 'bottom-right')
        // Компактная атрибуция MapLibre раскрыта, пока карту не потащат, а свёрнутую
        // карту не тащат — и плашка закрывала бы всю карточку. Сворачиваем до «i»
        const minimizeAttribution = () =>
          map
            .getContainer()
            .querySelector('.maplibregl-compact-show')
            ?.classList.remove('maplibregl-compact-show')
        map.on('resize', minimizeAttribution)
        map.on('sourcedata', (event) => {
          if (event.sourceDataType === 'metadata') minimizeAttribution()
        })
        minimizeAttribution()

        setInteractive(map, false)
        map.on('moveend', renderMarkers)

        mapRef.current = map
        libRef.current = lib
        setReady(true)
      })
      .catch(() => setFailed(true))

    return () => {
      cancelled = true
      markers.forEach((marker) => marker.remove())
      markers.clear()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [renderMarkers])

  // Новые данные — новый индекс кластеров; вид подгоняется под учреждения один раз
  useEffect(() => {
    placesRef.current = places
    if (!ready) return

    const index = new Supercluster<LeafProps>({
      radius: 56,
      maxZoom: CLUSTER_MAX_ZOOM,
      map: (props) => ({ placeKey: props.placeKey }),
      reduce: (accumulated, props) => {
        const keys = new Set([...accumulated.placeKey.split(','), ...props.placeKey.split(',')])
        accumulated.placeKey = Array.from(keys).join(',')
      },
    })

    index.load(
      places.flatMap((place) => {
        // Учреждение без объектов всё равно должно быть на карте
        const items = place.items.length ? place.items : [{ id: place.id } as MapItem]
        return items.map((item) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [place.longitude, place.latitude] },
          properties: { placeId: place.id, itemId: `${place.id}:${item.id}`, placeKey: place.id },
        }))
      })
    )

    indexRef.current = index
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current.clear()

    const map = mapRef.current
    if (map && places.length && !fittedRef.current) {
      fittedRef.current = true
      fitToPlaces(map, places, expandedRef.current)
    }

    renderMarkers()
  }, [places, ready, renderMarkers])

  const expand = useCallback(() => {
    const slot = slotRef.current
    const element = windowRef.current
    if (expanded || animatingRef.current || !slot || !element) return

    const from = slot.getBoundingClientRect()
    flushSync(() => setExpanded(true))

    // На весь экран — сразу показать улицу крупнее, чем в карточке
    const zoomIn = () => {
      const map = mapRef.current
      if (!map) return
      map.resize()
      fitToPlaces(map, placesRef.current, true, prefersReducedMotion() ? 0 : 600)
    }

    if (prefersReducedMotion()) {
      zoomIn()
      return
    }

    animatingRef.current = true
    const animation = element.animate([frame(from, CARD_RADIUS), frame(viewport(), 0)], {
      duration: 420,
      easing: EASE,
    })
    animation.onfinish = () => {
      animatingRef.current = false
      zoomIn()
    }
    animation.oncancel = () => {
      animatingRef.current = false
    }
  }, [expanded])

  const collapse = useCallback(() => {
    const slot = slotRef.current
    const element = windowRef.current
    if (!expanded || animatingRef.current || !slot || !element) return

    setSheetPlaceIds(null)

    // Карточка в ленте всегда показывает обзор, куда бы ни увели карту
    const backToOverview = () => {
      const map = mapRef.current
      if (!map) return
      map.resize()
      fitToPlaces(map, placesRef.current, false)
    }

    if (prefersReducedMotion()) {
      flushSync(() => setExpanded(false))
      backToOverview()
      return
    }

    // Пока окно летит обратно, слот мог уехать при прокрутке — берём его место сейчас
    const to = slot.getBoundingClientRect()
    animatingRef.current = true
    const animation = element.animate([frame(viewport(), 0), frame(to, CARD_RADIUS)], {
      duration: 360,
      easing: EASE,
      fill: 'forwards',
    })
    animation.onfinish = () => {
      // Сначала окно возвращается в поток, потом снимается анимация — без мигания
      flushSync(() => setExpanded(false))
      animation.cancel()
      animatingRef.current = false
      backToOverview()
    }
  }, [expanded])

  // Развёрнутая карта: жесты, Escape, фокус и прокрутка страницы под ней
  useEffect(() => {
    const map = mapRef.current
    if (map) setInteractive(map, expanded)
    if (!expanded) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    toggleRef.current?.focus({ preventScroll: true })

    // Escape закрывает сначала список, потом саму карту
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (sheetOpenRef.current) setSheetPlaceIds(null)
      else collapse()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [expanded, collapse])

  const sheetPlaces = (sheetPlaceIds ?? [])
    .map((id) => places.find((place) => place.id === id))
    .filter((place): place is MapPlace => Boolean(place))

  return (
    <div className={styles.slot} ref={slotRef}>
      <div
        ref={windowRef}
        className={`${styles.window} ${expanded ? styles.expanded : ''}`}
        role={expanded ? 'dialog' : undefined}
        aria-modal={expanded || undefined}
        aria-label={expanded ? 'Карта учреждений' : undefined}
      >
        {failed ? (
          <ImageWithFallback src="/prototype/map.png" alt="" className={styles.fallback} bare />
        ) : (
          <div ref={containerRef} className={styles.map} />
        )}

        <div className={styles.tint} aria-hidden />

        {/* Свёрнутая карта не ловит жесты: тап по ней только разворачивает */}
        {!expanded && (
          <button className={styles.cover} type="button" aria-label="Развернуть карту" onClick={expand} />
        )}

        <button
          ref={toggleRef}
          className={styles.toggle}
          type="button"
          aria-label={expanded ? 'Свернуть карту' : 'Развернуть карту'}
          aria-expanded={expanded}
          onClick={expanded ? collapse : expand}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            {expanded ? (
              <path
                d="M20 4l-6 6m0-5v5h5M4 20l6-6m0 5v-5H5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M14 4h6v6m0-6-6.5 6.5M10 20H4v-6m0 6 6.5-6.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </button>

        {expanded && (
          <div className={styles.heading}>
            <span className={styles.headingTitle}>Большая Московская</span>
            <span className={styles.headingCaption}>
              {places.length} {pluralize(places.length, ['учреждение', 'учреждения', 'учреждений'])} ·
              нажмите на кластер
            </span>
          </div>
        )}

        {expanded && sheetPlaces.length > 0 && (
          <div className={styles.sheet}>
            <button
              className={styles.sheetClose}
              type="button"
              aria-label="Закрыть список"
              onClick={() => setSheetPlaceIds(null)}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>

            {sheetPlaces.map((place) => (
              <section key={place.id} className={styles.place}>
                <button className={styles.placeHead} type="button" onClick={() => router.push(place.href)}>
                  <span className={styles.placeName}>{place.name}</span>
                  <span className={styles.placeAddress}>{place.address}</span>
                </button>

                <ul className={styles.items}>
                  {place.items.map((item) => (
                    <li key={item.id}>
                      <button className={styles.item} type="button" onClick={() => router.push(item.href)}>
                        <span className={`${styles.itemKind} ${styles[`kind_${item.kind}`]}`}>
                          {KIND_LABEL[item.kind]}
                        </span>
                        <span className={styles.itemTitle}>{item.title}</span>
                        {item.caption && <span className={styles.itemCaption}>{item.caption}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Кружок кластера с числом объектов или одиночная точка */
function createMarkerElement(props: FeatureProps, places: MapPlace[]) {
  const element = document.createElement('button')
  element.type = 'button'

  const placeIds = props.placeKey.split(',')
  const place = places.find((item) => item.id === placeIds[0])

  if (props.cluster) {
    const count = props.point_count ?? 0
    element.className = styles.cluster
    element.style.setProperty('--size', `${Math.min(64, 34 + Math.log2(count) * 8)}px`)
    element.setAttribute('aria-label', `${count} ${pluralize(count, ['объект', 'объекта', 'объектов'])}`)

    const value = document.createElement('span')
    value.className = styles.clusterCount
    value.textContent = String(count)
    element.append(value)
  } else {
    element.className = styles.point
    element.setAttribute('aria-label', place?.name ?? 'Объект')
  }

  // Подпись нужна только одному учреждению: у смешанного кластера имени нет
  if (place && placeIds.length === 1) {
    const caption = document.createElement('span')
    caption.className = styles.caption
    caption.textContent = place.name
    element.append(caption)
  }

  return element
}
