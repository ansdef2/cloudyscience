import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl'

/**
 * Стиль карты под макет: тёмно-фиолетовый фон, полупрозрачные лавандовые
 * дома и тонкие светлые дороги — как на подложке prototype/map.png.
 *
 * Векторные тайлы — OpenFreeMap (схема OpenMapTiles, данные OpenStreetMap):
 * бесплатно, без ключа и без лимитов. Для своего тайл-сервера достаточно
 * переопределить адреса переменными окружения на этапе сборки.
 */
const TILES_URL = process.env.NEXT_PUBLIC_MAP_TILES_URL || 'https://tiles.openfreemap.org/planet'
const GLYPHS_URL =
  process.env.NEXT_PUBLIC_MAP_GLYPHS_URL || 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'

export const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
  '© <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">участники OpenStreetMap</a>'

/** Улица, вдоль которой стоят учреждения, — её подсвечиваем */
export const HIGHLIGHT_STREET = 'Большая Московская'

const PALETTE = {
  background: '#0d0619',
  land: '#120a22',
  park: '#140f26',
  water: '#1c0f3f',
  waterLine: '#2a1760',
  building: 'rgba(176, 156, 230, 0.13)',
  buildingEdge: 'rgba(206, 192, 255, 0.24)',
  roadMinor: 'rgba(255, 255, 255, 0.10)',
  roadMid: 'rgba(228, 218, 255, 0.22)',
  roadMajor: 'rgba(236, 228, 255, 0.36)',
  rail: 'rgba(255, 255, 255, 0.14)',
  highlight: 'rgba(160, 96, 255, 0.85)',
  highlightGlow: 'rgba(130, 40, 220, 0.45)',
  label: 'rgba(255, 255, 255, 0.55)',
  labelDim: 'rgba(255, 255, 255, 0.38)',
  waterLabel: 'rgba(170, 150, 255, 0.55)',
  halo: '#0d0619',
}

const FONT_REGULAR = ['Noto Sans Regular']
const FONT_ITALIC = ['Noto Sans Italic']

/** Русское название, если есть, иначе исходное */
const NAME: ExpressionSpecification = ['coalesce', ['get', 'name:ru'], ['get', 'name']]

const byZoom = (...stops: number[]): ExpressionSpecification =>
  ['interpolate', ['exponential', 1.5], ['zoom'], ...stops] as ExpressionSpecification

const classIn = (...classes: string[]): ExpressionSpecification => [
  'match',
  ['get', 'class'],
  classes,
  true,
  false,
]

export const buildMapStyle = (): StyleSpecification => ({
  version: 8,
  glyphs: GLYPHS_URL,
  sources: {
    openmaptiles: {
      type: 'vector',
      url: TILES_URL,
      attribution: MAP_ATTRIBUTION,
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': PALETTE.background } },
    {
      id: 'landuse',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      paint: { 'fill-color': PALETTE.land, 'fill-opacity': 0.8 },
    },
    {
      id: 'landcover',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: classIn('wood', 'grass', 'farmland', 'wetland'),
      paint: { 'fill-color': PALETTE.park, 'fill-opacity': 0.7 },
    },
    {
      id: 'park',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'park',
      paint: { 'fill-color': PALETTE.park },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: { 'fill-color': PALETTE.water },
    },
    {
      id: 'waterway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      paint: { 'line-color': PALETTE.waterLine, 'line-width': byZoom(10, 0.5, 18, 4) },
    },
    {
      id: 'building',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 13,
      paint: {
        'fill-color': PALETTE.building,
        'fill-outline-color': PALETTE.buildingEdge,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.5, 1],
      },
    },
    {
      id: 'road-path',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 15,
      filter: classIn('path', 'track'),
      paint: {
        'line-color': PALETTE.roadMinor,
        'line-width': byZoom(15, 0.6, 18, 1.6),
        'line-dasharray': [2, 2],
      },
    },
    {
      id: 'road-rail',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: classIn('rail', 'transit'),
      paint: { 'line-color': PALETTE.rail, 'line-width': byZoom(12, 0.6, 18, 2), 'line-dasharray': [3, 3] },
    },
    {
      id: 'road-minor',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 12,
      filter: classIn('minor', 'service'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': PALETTE.roadMinor, 'line-width': byZoom(12, 0.4, 18, 7) },
    },
    {
      id: 'road-mid',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: classIn('tertiary', 'secondary'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': PALETTE.roadMid, 'line-width': byZoom(10, 0.6, 18, 11) },
    },
    {
      id: 'road-major',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: classIn('primary', 'trunk', 'motorway'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': PALETTE.roadMajor, 'line-width': byZoom(8, 0.8, 18, 14) },
    },
    // Большая Московская: размытое свечение и линия поверх — как акцент в макете
    {
      id: 'street-highlight-glow',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      filter: ['in', HIGHLIGHT_STREET, ['to-string', ['get', 'name']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': PALETTE.highlightGlow,
        'line-width': byZoom(10, 6, 18, 36),
        'line-blur': byZoom(10, 4, 18, 22),
      },
    },
    {
      id: 'street-highlight',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      filter: ['in', HIGHLIGHT_STREET, ['to-string', ['get', 'name']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': PALETTE.highlight, 'line-width': byZoom(10, 1.2, 18, 5) },
    },
    {
      id: 'water-name',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'water_name',
      layout: {
        'text-field': NAME,
        'text-font': FONT_ITALIC,
        'text-size': 11,
        'symbol-placement': 'line',
        'text-letter-spacing': 0.1,
      },
      paint: { 'text-color': PALETTE.waterLabel, 'text-halo-color': PALETTE.halo, 'text-halo-width': 1 },
    },
    {
      id: 'road-name',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: 14,
      layout: {
        'text-field': NAME,
        'text-font': FONT_REGULAR,
        'text-size': byZoom(14, 9, 18, 13),
        'symbol-placement': 'line',
        'text-max-angle': 30,
      },
      paint: { 'text-color': PALETTE.labelDim, 'text-halo-color': PALETTE.halo, 'text-halo-width': 1.2 },
    },
    {
      id: 'poi-name',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'poi',
      minzoom: 16,
      filter: ['<=', ['get', 'rank'], 20],
      layout: {
        'text-field': NAME,
        'text-font': FONT_REGULAR,
        'text-size': 10,
        'text-max-width': 8,
      },
      paint: { 'text-color': PALETTE.labelDim, 'text-halo-color': PALETTE.halo, 'text-halo-width': 1 },
    },
    {
      id: 'place-name',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: classIn('city', 'town', 'suburb', 'quarter', 'neighbourhood'),
      layout: {
        'text-field': NAME,
        'text-font': FONT_REGULAR,
        'text-size': ['match', ['get', 'class'], ['city', 'town'], 14, 11],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.12,
      },
      paint: { 'text-color': PALETTE.label, 'text-halo-color': PALETTE.halo, 'text-halo-width': 1.2 },
    },
  ],
})
