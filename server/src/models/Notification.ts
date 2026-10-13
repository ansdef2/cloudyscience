import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

/** Уведомление в колокольчике: о брони, заявке, приглашении в команду, жалобе */
class Notification extends Model {
  public id!: string;
  public userId!: string;
  public type!: string;
  public title!: string;
  public body?: string | null;
  /** Куда ведёт нажатие — путь на сайте */
  public link?: string | null;
  public readAt?: Date | null;
  public createdAt!: Date;
}

Notification.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    type: { type: DataTypes.STRING(40), allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT },
    link: { type: DataTypes.STRING },
    readAt: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: true,
    updatedAt: false,
    indexes: [{ fields: ['userId', 'createdAt'] }],
  }
);

Notification.belongsTo(User, { foreignKey: 'userId' });

export default Notification;
