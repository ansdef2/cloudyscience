import { Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';
import IotChannel, { IOT_PROVIDERS, IotProviderKind } from '../models/IotChannel';
import { IOT_PROVIDER_REGISTRY, IotConfigError } from '../iot/providers';
import { sendError } from '../utils/sendError';

const newSecret = () => randomBytes(24).toString('base64url');

/** Публичный вид канала: без токена и сырого тела последнего события */
const toPublic = (channel: IotChannel) => ({
  id: channel.id,
  equipmentId: channel.equipmentId,
  provider: channel.provider,
  providerTitle: IOT_PROVIDER_REGISTRY[channel.provider].title,
  name: channel.name,
  enabled: channel.enabled,
  link: (channel.config as { sharedConnectionUrl?: string })?.sharedConnectionUrl ?? null,
  lastReading: channel.lastReading ?? null,
  lastSeenAt: channel.lastSeenAt ?? null,
});

/** Админский вид: всё, кроме токена */
const toAdmin = (channel: IotChannel) => {
  const { secret: _secret, ...rest } = channel.toJSON() as Record<string, unknown>;
  return { ...rest, webhookPath: `/api/iot/webhook/${channel.id}` };
};

const parseProvider = (value: unknown): IotProviderKind | null =>
  IOT_PROVIDERS.includes(value as IotProviderKind) ? (value as IotProviderKind) : null;

const sameToken = (expected: string, received: unknown) => {
  if (typeof received !== 'string' || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
};

const sendConfigError = (res: Response, error: unknown) => {
  if (error instanceof IotConfigError) {
    return res.status(400).json({ error: error.message });
  }
  return sendError(res, error);
};

/** Каналы оборудования — открыто, чтобы карточка показывала статус устройства */
export const getChannels = async (req: Request, res: Response) => {
  try {
    const where: Record<string, unknown> = { enabled: true };
    if (req.query.equipmentId) where.equipmentId = req.query.equipmentId;

    const channels = await IotChannel.findAll({ where, order: [['createdAt', 'ASC']] });
    res.json(channels.map(toPublic));
  } catch (error) {
    sendError(res, error);
  }
};

export const getAllChannelsAdmin = async (_req: Request, res: Response) => {
  try {
    const channels = await IotChannel.findAll({ order: [['createdAt', 'ASC']] });
    res.json(channels.map(toAdmin));
  } catch (error) {
    sendError(res, error);
  }
};

/** Создать канал. Токен вебхука возвращается только здесь — сохраните его */
export const createChannel = async (req: Request, res: Response) => {
  try {
    const provider = parseProvider(req.body?.provider);
    if (!provider) {
      return res.status(400).json({ error: `provider: одно из ${IOT_PROVIDERS.join(', ')}` });
    }

    const config = IOT_PROVIDER_REGISTRY[provider].validateConfig(req.body?.config);
    const secret = newSecret();
    const channel = await IotChannel.create({
      provider,
      config,
      secret,
      name: req.body?.name,
      equipmentId: req.body?.equipmentId ?? null,
      enabled: req.body?.enabled === true,
    });

    res.status(201).json({ ...toAdmin(channel), secret });
  } catch (error) {
    sendConfigError(res, error);
  }
};

export const updateChannel = async (req: Request, res: Response) => {
  try {
    const channel = await IotChannel.findByPk(req.params.id);
    if (!channel) return res.status(404).json({ error: 'Канал не найден' });

    const changes: Record<string, unknown> = {};
    if (req.body?.name !== undefined) changes.name = req.body.name;
    if (req.body?.equipmentId !== undefined) changes.equipmentId = req.body.equipmentId;
    if (req.body?.enabled !== undefined) changes.enabled = req.body.enabled === true;
    if (req.body?.config !== undefined) {
      changes.config = IOT_PROVIDER_REGISTRY[channel.provider].validateConfig(req.body.config);
    }

    await channel.update(changes);

    // Новый токен по запросу: старый сразу перестаёт приниматься
    if (req.body?.rotateSecret === true) {
      const secret = newSecret();
      await channel.update({ secret });
      return res.json({ ...toAdmin(channel), secret });
    }

    res.json(toAdmin(channel));
  } catch (error) {
    sendConfigError(res, error);
  }
};

export const deleteChannel = async (req: Request, res: Response) => {
  try {
    const removed = await IotChannel.destroy({ where: { id: req.params.id } });
    if (!removed) return res.status(404).json({ error: 'Канал не найден' });
    res.json({ message: 'Канал удалён' });
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * Приём события от провайдера. Токен — в ?token= (OctoEverywhere не даёт
 * задать заголовки вебхука) или в заголовке X-Iot-Token.
 */
export const receiveWebhook = async (req: Request, res: Response) => {
  try {
    const channel = await IotChannel.findByPk(req.params.id);
    const token = req.query.token ?? req.header('x-iot-token');

    // Чужому и выключенному каналу ответ одинаковый — не подсказываем, какие id существуют
    if (!channel || !channel.enabled || !sameToken(channel.secret, token)) {
      return res.status(404).json({ error: 'Канал не найден' });
    }

    const reading = IOT_PROVIDER_REGISTRY[channel.provider].fromPayload(req.body);
    await channel.update({ lastReading: reading, lastPayload: req.body ?? null, lastSeenAt: new Date() });

    res.status(204).end();
  } catch (error) {
    sendError(res, error);
  }
};

/** Опросить канал, у которого провайдер умеет забирать данные сам (Zenoh) */
export const refreshChannel = async (channel: IotChannel) => {
  const provider = IOT_PROVIDER_REGISTRY[channel.provider];
  if (!provider.fetchLatest) return false;

  const latest = await provider.fetchLatest(channel);
  if (!latest) return false;

  await channel.update({ lastReading: latest.reading, lastPayload: latest.payload, lastSeenAt: new Date() });
  return true;
};

export const refreshChannelHandler = async (req: Request, res: Response) => {
  try {
    const channel = await IotChannel.findByPk(req.params.id);
    if (!channel) return res.status(404).json({ error: 'Канал не найден' });

    if (!IOT_PROVIDER_REGISTRY[channel.provider].fetchLatest) {
      return res.status(400).json({ error: 'Этот провайдер присылает данные сам, опрашивать его не нужно' });
    }

    try {
      await refreshChannel(channel);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(502).json({ error: `Устройство не ответило: ${message}` });
    }

    res.json(toAdmin(channel));
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * Фоновый опрос включённых каналов Zenoh. Включается переменной
 * IOT_POLL_INTERVAL_SEC; по умолчанию выключен.
 */
export const startIotPolling = () => {
  const seconds = Number(process.env.IOT_POLL_INTERVAL_SEC);
  if (!Number.isFinite(seconds) || seconds <= 0) return;

  const pollable = IOT_PROVIDERS.filter((kind) => IOT_PROVIDER_REGISTRY[kind].fetchLatest);

  const describe = (error: unknown) => (error instanceof Error ? error.message : error);

  setInterval(async () => {
    try {
      const channels = await IotChannel.findAll({ where: { enabled: true, provider: pollable } });
      for (const channel of channels) {
        await refreshChannel(channel).catch((error) =>
          console.warn(`IoT-канал ${channel.id} не ответил:`, describe(error))
        );
      }
    } catch (error) {
      console.warn('Опрос IoT-каналов не удался:', describe(error));
    }
  }, Math.max(5, seconds) * 1000).unref();

  console.log(`Опрос IoT-каналов каждые ${Math.max(5, seconds)} с`);
};
