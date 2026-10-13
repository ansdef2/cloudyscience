// IoT-каналы оборудования: OctoEverywhere и Zenoh (server/src/routes/iot.ts)

import { api } from '@/utils/api'

export interface IotReading {
  state?: string
  progress?: number
  job?: string
}

export interface IotChannel {
  id: string
  equipmentId: string | null
  provider: 'octoeverywhere' | 'zenoh'
  providerTitle: string
  name: string
  /** Ссылка на устройство у провайдера, например Shared Connection OctoEverywhere */
  link: string | null
  lastReading: IotReading | null
  lastSeenAt: string | null
}

/** Включённые каналы единицы оборудования. Пусто — устройство не подключено */
export async function getEquipmentChannels(equipmentId: string): Promise<IotChannel[]> {
  try {
    const response = await api.get<IotChannel[]>(
      `/iot/channels?equipmentId=${encodeURIComponent(equipmentId)}`
    )
    return response.data
  } catch {
    // Телеметрия — дополнение к карточке: без неё карточка работает как раньше
    return []
  }
}
