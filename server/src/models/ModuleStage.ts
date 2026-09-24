import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import CourseModule from './CourseModule';

class ModuleStage extends Model {
  public id!: string;
  public moduleId!: string;
  public order!: number;
  public title!: string;
  public summary!: string;
  public outcome!: string;
  public theory!: string;
}

ModuleStage.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    moduleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'course_modules', key: 'id' },
      onDelete: 'CASCADE',
    },
    order: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    // Колонка «Содержание» из таблицы структуры модуля
    summary: { type: DataTypes.TEXT },
    // Колонка «Результат этапа»
    outcome: { type: DataTypes.TEXT },
    // Полный текст теоретического блока
    theory: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: 'module_stages', timestamps: true }
);

ModuleStage.belongsTo(CourseModule, { foreignKey: 'moduleId', as: 'module' });
CourseModule.hasMany(ModuleStage, { foreignKey: 'moduleId', as: 'stages', onDelete: 'CASCADE' });

export default ModuleStage;
