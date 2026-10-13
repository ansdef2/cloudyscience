import IotChannel, { IotProviderKind } from '../models/IotChannel';

/** Показание в общем виде — то, что видит фронтенд независимо от провайдера */
export interface IotReading {
  /** Событие или состояние устройства: «printing», «done», «idle»… */
  state?: string;
  /** Прогресс задания, 0–100 */
  progress?: number;
  /** Над чем устройство работает: имя файла печати и т.п. */
  job?: string;
}

export class IotConfigError extends Error {}

export interface IotProvider {
  kind: IotProviderKind;
  title: string;
  /** Проверяет и чистит настройки канала; бросает IotConfigError */
  validateConfig: (config: unknown) => Record<string, unknown>;
  /** Приводит тело входящего вебхука к общему виду */
  fromPayload: (payload: unknown) => IotReading;
  /** Забирает последнее показание сам — для провайдеров, которые надо опрашивать */
  fetchLatest?: (channel: IotChannel) => Promise<{ reading: IotReading; payload: unknown } | null>;
}

/** Поле объекта без учёта регистра и разделителей: EventType, event_type, eventType */
const pick = (source: unknown, ...names: string[]): unknown => {
  if (!source || typeof source !== 'object') return undefined;
  const normalize = (key: string) => key.toLowerCase().replace(/[_\-\s]/g, '');
  const wanted = names.map(normalize);
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (wanted.includes(normalize(key))) return value;
  }
  return undefined;
};

const asText = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

const asProgress = (value: unknown) => {
  const number = typeof value === 'string' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number)) return undefined;
  return Math.min(100, Math.max(0, number));
};

/** Общий разбор: работает и для OctoEverywhere, и для моста Zenoh, шлющего JSON */
const genericReading = (payload: unknown): IotReading => ({
  state: asText(pick(payload, 'state', 'status', 'eventType', 'event')),
  progress: asProgress(pick(payload, 'progress', 'percent', 'completion')),
  job: asText(pick(payload, 'fileName', 'printName', 'job', 'jobName')),
});

const optionalUrl = (value: unknown, field: string) => {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string') throw new IotConfigError(`${field}: ожидается строка`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new IotConfigError(`${field}: некорректный адрес`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new IotConfigError(`${field}: поддерживаются только http и https`);
  }
  return url.toString().replace(/\/$/, '');
};

/**
 * OctoEverywhere — облачный доступ к OctoPrint, Klipper и Bambu Lab.
 * Принтер в учреждении остаётся за NAT, а события печати (старт, прогресс,
 * завершение, ошибка) OctoEverywhere отправляет вебхуком на
 * POST /api/iot/webhook/:id?token=…  Ссылка Shared Connection, если задана,
 * показывается как «Открыть принтер».
 */
const octoEverywhere: IotProvider = {
  kind: 'octoeverywhere',
  title: 'OctoEverywhere',
  validateConfig: (config) => {
    const source = (config ?? {}) as Record<string, unknown>;
    const sharedConnectionUrl = optionalUrl(source.sharedConnectionUrl, 'sharedConnectionUrl');
    return sharedConnectionUrl ? { sharedConnectionUrl } : {};
  },
  fromPayload: genericReading,
};

/**
 * Zenoh — pub/sub для устройств. Сервер читает последнее значение по key
 * expression через REST-плагин роутера (GET {restUrl}/{keyExpr}, по
 * умолчанию порт 8000). Мост, подписанный на Zenoh, может вместо этого
 * сам слать JSON на тот же вебхук, что и OctoEverywhere.
 */
const zenoh: IotProvider = {
  kind: 'zenoh',
  title: 'Zenoh',
  validateConfig: (config) => {
    const source = (config ?? {}) as Record<string, unknown>;
    const restUrl = optionalUrl(source.restUrl, 'restUrl');
    const keyExpr = typeof source.keyExpr === 'string' ? source.keyExpr.trim().replace(/^\/+/, '') : '';
    if (!keyExpr) throw new IotConfigError('keyExpr: укажите key expression, например lab/printer-1/status');
    return restUrl ? { restUrl, keyExpr } : { keyExpr };
  },
  fromPayload: genericReading,
  fetchLatest: async (channel) => {
    const { restUrl, keyExpr } = channel.config as { restUrl?: string; keyExpr?: string };
    if (!restUrl || !keyExpr) return null;

    const response = await fetch(`${restUrl}/${keyExpr}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Zenoh REST ответил ${response.status}`);

    // REST-плагин отдаёт массив сэмплов [{ key, value, encoding, timestamp }]
    const samples = (await response.json()) as { value?: unknown }[];
    if (!Array.isArray(samples) || samples.length === 0) return null;

    const latest = samples[samples.length - 1];
    let value = latest?.value;
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        // Не JSON — тогда само значение и есть состояние
        value = { state: value };
      }
    }

    return { reading: genericReading(value), payload: latest };
  },
};

export const IOT_PROVIDER_REGISTRY: Record<IotProviderKind, IotProvider> = {
  octoeverywhere: octoEverywhere,
  zenoh,
};
