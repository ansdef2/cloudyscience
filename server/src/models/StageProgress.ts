import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import ModuleStage from './ModuleStage';
import User from './User';

/** Отметка «этап пройден». Строки нет — этап не пройден. */
class StageProgress extends Model {
  public id!: string;
  public userId!: string;
  public stageId!: string;
  public completedAt!: Date;
}

StageProgress.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    stageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'module_stages', key: 'id' },
      onDelete: 'CASCADE',
    },
    completedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'stage_progress',
    timestamps: true,
    // Один пользователь отмечает этап один раз
    indexes: [{ unique: true, fields: ['userId', 'stageId'] }],
  }
);

StageProgress.belongsTo(User, { foreignKey: 'userId' });
StageProgress.belongsTo(ModuleStage, { foreignKey: 'stageId' });

export default StageProgress;
