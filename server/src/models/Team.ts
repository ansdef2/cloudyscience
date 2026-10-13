import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

/**
 * Исследовательская команда: общая тема, чат и брони оборудования.
 * С курсами не связана. Тема исследования хранится в description.
 */
class Team extends Model {
  public id!: string;
  public name!: string;
  public description?: string | null;
  public ownerId!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Team.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
      validate: { len: { args: [2, 80], msg: 'Название команды — от 2 до 80 символов' } },
    },
    description: { type: DataTypes.TEXT },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
  },
  { sequelize, tableName: 'teams', timestamps: true }
);

Team.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

export default Team;
