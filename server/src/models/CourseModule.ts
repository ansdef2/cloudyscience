import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Course from './Course';

class CourseModule extends Model {
  public id!: string;
  public courseId!: string;
  public order!: number;
  public title!: string;
  public summary!: string;
  public goal!: string;
  public outcomes!: string[];
  public resultSummary!: string;
  public resultItems!: string[];
}

CourseModule.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
      onDelete: 'CASCADE',
    },
    // Порядковый номер модуля в курсе: по нему строится сортировка
    order: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    summary: { type: DataTypes.TEXT },
    goal: { type: DataTypes.TEXT },
    // Чему обучающийся научится
    outcomes: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
    // Что получается на выходе модуля и из чего этот результат состоит
    resultSummary: { type: DataTypes.TEXT },
    resultItems: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
  },
  { sequelize, tableName: 'course_modules', timestamps: true }
);

CourseModule.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Course.hasMany(CourseModule, { foreignKey: 'courseId', as: 'modules', onDelete: 'CASCADE' });

export default CourseModule;
