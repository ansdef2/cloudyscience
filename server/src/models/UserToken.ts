import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export type UserTokenPurpose = 'password_reset' | 'parent_consent';

/**
 * Одноразовая ссылка из письма: сброс пароля или согласие родителя.
 * В базе — только хеш: утечка таблицы не даёт рабочих ссылок.
 */
class UserToken extends Model {
  public id!: string;
  public userId!: string;
  public purpose!: UserTokenPurpose;
  public tokenHash!: string;
  public expiresAt!: Date;
  public usedAt?: Date | null;
  public createdAt!: Date;
}

UserToken.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    purpose: { type: DataTypes.ENUM('password_reset', 'parent_consent'), allowNull: false },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'user_tokens', timestamps: true, updatedAt: false }
);

UserToken.belongsTo(User, { foreignKey: 'userId' });

export default UserToken;
