import { DataTypes, Model, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Course from './Course';
import Equipment from './Equipment';

class Booking extends Model {
  public id!: string;
  public userId!: string;
  public courseId?: string;
  public equipmentId?: string;
  public date!: Date;
  public time!: string;
  public endTime?: string;
  public rentalType!: 'remote' | 'in-person';
  public status!: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  public files?: string[];
  public location?: string;
  public notes?: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  public getUser!: BelongsToGetAssociationMixin<User>;
  public getCourse!: BelongsToGetAssociationMixin<Course>;
  public getEquipment!: BelongsToGetAssociationMixin<Equipment>;
}

Booking.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    courseId: {
      type: DataTypes.UUID,
      references: {
        model: 'courses',
        key: 'id',
      },
    },
    equipmentId: {
      type: DataTypes.UUID,
      references: {
        model: 'equipment',
        key: 'id',
      },
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    time: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.STRING,
    },
    rentalType: {
      type: DataTypes.ENUM('remote', 'in-person'),
      defaultValue: 'remote',
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled'),
      defaultValue: 'pending',
    },
    files: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    location: {
      type: DataTypes.STRING,
    },
    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    tableName: 'bookings',
    timestamps: true,
  }
);

Booking.belongsTo(User, { foreignKey: 'userId' });
Booking.belongsTo(Course, { foreignKey: 'courseId' });
Booking.belongsTo(Equipment, { foreignKey: 'equipmentId' });

export default Booking;
