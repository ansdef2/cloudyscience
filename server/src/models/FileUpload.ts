import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Booking from './Booking';
import User from './User';

/**
 * Загруженный файл.
 * private — файлы к брони: скачивают автор, команда брони и администратор.
 * public — аватары и картинки каталога: отдаются всем по адресу /api/files/<storedName>.
 * Файл к брони сначала загружается «ничейным» (bookingId пуст) и
 * прикрепляется при создании брони; неприкреплённые чистятся через сутки.
 */
class FileUpload extends Model {
  public id!: string;
  public ownerId!: string;
  public bookingId?: string | null;
  public visibility!: 'private' | 'public';
  public originalName!: string;
  public storedName!: string;
  public mimeType!: string;
  public size!: number;
  public createdAt!: Date;
}

FileUpload.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    bookingId: {
      type: DataTypes.UUID,
      references: { model: 'bookings', key: 'id' },
      onDelete: 'CASCADE',
    },
    visibility: { type: DataTypes.ENUM('private', 'public'), allowNull: false, defaultValue: 'private' },
    originalName: { type: DataTypes.STRING, allowNull: false },
    storedName: { type: DataTypes.STRING, allowNull: false, unique: true },
    mimeType: { type: DataTypes.STRING, allowNull: false, defaultValue: 'application/octet-stream' },
    size: { type: DataTypes.INTEGER, allowNull: false },
  },
  { sequelize, tableName: 'uploads', timestamps: true, updatedAt: false }
);

FileUpload.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
FileUpload.belongsTo(Booking, { foreignKey: 'bookingId' });
Booking.hasMany(FileUpload, { foreignKey: 'bookingId', as: 'uploads' });

export default FileUpload;
