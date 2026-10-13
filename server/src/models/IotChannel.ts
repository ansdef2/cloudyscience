import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Equipment from './Equipment';

export const IOT_PROVIDERS = ['octoeverywhere', 'zenoh'] as const;
export type IotProviderKind = (typeof IOT_PROVIDERS)[number];

/**
 * IoT-канал единицы оборудования: откуда приходит её телеметрия.
 *
 * OctoEverywhere сам присылает события вебхуком, Zenoh опрашивается через
 * REST-плагин роутера. Канал создаётся выключенным — это резерв под
 * подключение, данные начинают приниматься после enabled = true.
 */
class IotChannel extends Model {
  public id!: string;
  public equipmentId?: string | null;
  public provider!: IotProviderKind;
  public name!: string;
  public enabled!: boolean;
  /** Настройки провайдера без секретов: адрес роутера, key expression и т.п. */
  public config!: Record<string, unknown>;
  /** Токен вебхука. Наружу не отдаётся, кроме ответа на создание канала */
  public secret!: string;
  /** Последнее показание, приведённое к общему виду, и сырое тело как пришло */
  public lastReading?: Record<string, unknown> | null;
  public lastPayload?: unknown;
  public lastSeenAt?: Date | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

IotChannel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    equipmentId: {
      type: DataTypes.UUID,
      references: { model: 'equipment', key: 'id' },
      onDelete: 'SET NULL',
    },
    provider: { type: DataTypes.ENUM(...IOT_PROVIDERS), allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    config: { type: DataTypes.JSONB, defaultValue: {} },
    secret: { type: DataTypes.STRING, allowNull: false },
    lastReading: { type: DataTypes.JSONB },
    lastPayload: { type: DataTypes.JSONB },
    lastSeenAt: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: 'iot_channels',
    timestamps: true,
  }
);

IotChannel.belongsTo(Equipment, { foreignKey: 'equipmentId' });

export default IotChannel;
