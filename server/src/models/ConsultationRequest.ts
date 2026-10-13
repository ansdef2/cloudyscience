import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Specialist from './Specialist';
import User from './User';

/** Заявка на консультацию с экспертом. Разбирает администратор */
class ConsultationRequest extends Model {
  public id!: string;
  public userId!: string;
  public specialistId!: string;
  public message?: string | null;
  public preferredDate?: string | null;
  public preferredTime?: string | null;
  public status!: 'new' | 'confirmed' | 'done' | 'cancelled';
  public createdAt!: Date;
}

ConsultationRequest.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    specialistId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'specialists', key: 'id' },
      onDelete: 'CASCADE',
    },
    message: { type: DataTypes.TEXT, validate: { len: { args: [0, 2000], msg: 'Не длиннее 2000 символов' } } },
    preferredDate: { type: DataTypes.DATEONLY },
    preferredTime: { type: DataTypes.STRING(5) },
    status: {
      type: DataTypes.ENUM('new', 'confirmed', 'done', 'cancelled'),
      defaultValue: 'new',
    },
  },
  { sequelize, tableName: 'consultation_requests', timestamps: true }
);

ConsultationRequest.belongsTo(User, { foreignKey: 'userId' });
ConsultationRequest.belongsTo(Specialist, { foreignKey: 'specialistId' });

export default ConsultationRequest;
