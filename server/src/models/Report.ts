import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export const REPORT_REASONS = ['spam', 'insult', 'adult', 'danger', 'fraud', 'other'] as const;

/**
 * Жалоба на пользователя или сообщение. Текст сообщения копируется
 * в жалобу — администратор увидит его, даже если сообщение удалят.
 */
class Report extends Model {
  public id!: string;
  public reporterId!: string;
  public targetUserId!: string;
  public messageId?: string | null;
  public messageText?: string | null;
  public reason!: (typeof REPORT_REASONS)[number];
  public comment?: string | null;
  public status!: 'open' | 'resolved' | 'dismissed';
  public resolution?: string | null;
  public resolvedById?: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Report.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    reporterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    targetUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    messageId: { type: DataTypes.UUID },
    messageText: { type: DataTypes.TEXT },
    reason: { type: DataTypes.ENUM(...REPORT_REASONS), allowNull: false },
    comment: { type: DataTypes.TEXT },
    status: { type: DataTypes.ENUM('open', 'resolved', 'dismissed'), allowNull: false, defaultValue: 'open' },
    resolution: { type: DataTypes.TEXT },
    resolvedById: { type: DataTypes.UUID, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
  },
  { sequelize, tableName: 'reports', timestamps: true }
);

Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
Report.belongsTo(User, { foreignKey: 'targetUserId', as: 'target' });

export default Report;
