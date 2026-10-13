import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Team from './Team';
import User from './User';

/**
 * Сообщение чата. Личное — с recipientId, командное — с teamId;
 * ровно одно из двух задано (проверяет контроллер).
 */
class Message extends Model {
  public id!: string;
  public senderId!: string;
  public recipientId?: string | null;
  public teamId?: string | null;
  public text!: string;
  public readAt?: Date | null;
  public createdAt!: Date;
}

Message.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    recipientId: {
      type: DataTypes.UUID,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    teamId: {
      type: DataTypes.UUID,
      references: { model: 'teams', key: 'id' },
      onDelete: 'CASCADE',
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { len: { args: [1, 2000], msg: 'Сообщение — от 1 до 2000 символов' } },
    },
    readAt: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: 'messages',
    timestamps: true,
    indexes: [{ fields: ['senderId', 'recipientId'] }, { fields: ['recipientId'] }, { fields: ['teamId', 'createdAt'] }],
  }
);

Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(Team, { foreignKey: 'teamId' });

export default Message;
