import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Course from './Course';
import User from './User';

/**
 * Запись обучающегося на курс. Занимает одно из мест курса и открывает
 * отметки прогресса. Строка на пару «пользователь + курс» — не больше одной.
 */
class CourseEnrollment extends Model {
  public id!: string;
  public userId!: string;
  public courseId!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

CourseEnrollment.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: 'course_enrollments',
    timestamps: true,
    // Повторная запись упирается в индекс, даже если две пришли одновременно
    indexes: [{ unique: true, fields: ['userId', 'courseId'] }],
  }
);

CourseEnrollment.belongsTo(User, { foreignKey: 'userId' });
CourseEnrollment.belongsTo(Course, { foreignKey: 'courseId' });

export default CourseEnrollment;
