import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Institution extends Model {
  public id!: string;
  public name!: string;
  public address!: string;
  public workingHours!: string;
  public phone!: string;
  public website!: string;
  public logo!: string;
  public images!: string[];
  public isOpen!: boolean;
  public latitude?: number | null;
  public longitude?: number | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Institution.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    workingHours: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    website: {
      type: DataTypes.STRING,
    },
    logo: {
      type: DataTypes.STRING,
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    isOpen: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // Точка на карте главного экрана; без координат учреждение на карту не попадает
    latitude: {
      type: DataTypes.DOUBLE,
      validate: { min: -90, max: 90 },
    },
    longitude: {
      type: DataTypes.DOUBLE,
      validate: { min: -180, max: 180 },
    },
  },
  {
    sequelize,
    tableName: 'institutions',
    timestamps: true,
  }
);

export default Institution;
