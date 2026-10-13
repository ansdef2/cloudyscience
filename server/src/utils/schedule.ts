/**
 * Расписание брони: часы работы, слоты и «сегодня» по времени площадок.
 *
 * Все учреждения в Великом Новгороде (UTC+3), а сервер в контейнере живёт
 * в UTC. Поэтому «сегодня» и «уже прошло» считаются в часовом поясе
 * площадок, а не сервера — иначе после 21:00 по Москве календарь
 * предлагал бы вчерашний день.
 */

export const SITE_TIME_ZONE = process.env.SITE_TIME_ZONE || 'Europe/Moscow';

/** На сколько дней вперёд можно бронировать */
export const BOOKING_HORIZON_DAYS = 90;

/** Часы работы, если в карточке оборудования их не разобрать */
const FALLBACK_HOURS = { start: 9 * 60, end: 18 * 60 };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const pad = (value: number) => String(value).padStart(2, '0');

export const toMinutes = (time: string) => {
  const match = TIME_RE.exec(time.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

export const fromMinutes = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/**
 * «9:00-19:00», «09:00 – 19:00», «Пн–Пт 10:00–17:00» → минуты начала и конца.
 * Берутся первые два времени в строке.
 */
export const parseWorkingHours = (value?: string | null) => {
  const times = (value ?? '').match(/\d{1,2}:\d{2}/g) ?? [];
  const start = times[0] ? toMinutes(times[0]) : null;
  const end = times[1] ? toMinutes(times[1]) : null;
  if (start === null || end === null || end <= start) return FALLBACK_HOURS;
  return { start, end };
};

/** Часовые слоты: последний начинается за час до закрытия */
export const slotsFor = (workingHours?: string | null) => {
  const { start, end } = parseWorkingHours(workingHours);
  const slots: string[] = [];
  for (let minutes = start; minutes + 60 <= end; minutes += 60) slots.push(fromMinutes(minutes));
  return slots;
};

/** Дата и минуты «сейчас» в часовом поясе площадок */
export const siteNow = (now = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: SITE_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
};

export const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Сдвиг календарной даты YYYY-MM-DD на n дней */
export const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

/**
 * Бронь хранит дату как полночь UTC выбранного дня — так её одинаково
 * показывают и браузер в Москве, и сервер в UTC. Поиск броней на день —
 * по интервалу, чтобы находились и записи, созданные до этого правила.
 */
export const dayRange = (date: string) => ({
  start: new Date(`${date}T00:00:00.000Z`),
  end: new Date(`${addDays(date, 1)}T00:00:00.000Z`),
});

export const storedDate = (date: string) => new Date(`${date}T00:00:00.000Z`);

/**
 * Можно ли бронировать слот: дата не в прошлом и не дальше горизонта,
 * время — один из слотов по часам работы и ещё не наступило.
 * Возвращает текст ошибки или null.
 */
export const validateSlot = (date: unknown, time: unknown, workingHours?: string | null) => {
  if (!isIsoDate(date)) return 'Дата в формате ГГГГ-ММ-ДД';
  if (typeof time !== 'string' || toMinutes(time) === null) return 'Время в формате ЧЧ:ММ';

  const now = siteNow();
  if (date < now.date) return 'Эта дата уже прошла';
  if (date > addDays(now.date, BOOKING_HORIZON_DAYS)) {
    return `Бронировать можно не дальше чем на ${BOOKING_HORIZON_DAYS} дней вперёд`;
  }

  const normalized = fromMinutes(toMinutes(time)!);
  if (!slotsFor(workingHours).includes(normalized)) return 'В это время оборудование не работает';
  if (date === now.date && toMinutes(normalized)! <= now.minutes) return 'Это время уже прошло';
  return null;
};

export const normalizeTime = (time: string) => fromMinutes(toMinutes(time)!);
