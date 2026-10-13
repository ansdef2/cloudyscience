import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

/** Личная блокировка: заблокированный не может писать и звать в команды */
class UserBlock extends Model {
  public id!: string;
  public blockerId!: string;
  public blockedId!: string;
  public createdAt!: Date;
}

UserBlock.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    blockerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    blockedId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: 'user_blocks',
    timestamps: true,
    updatedAt: false,
    indexes: [{ unique: true, fields: ['blockerId', 'blockedId'] }],
  }
);

export default UserBlock;
