import { DataTypes, Model, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../config/database';
import Institution from './Institution';

class Equipment extends Model {
  public id!: string;
  public institutionId!: string;
  public name!: string;
  public type!: string;
  public description!: string;
  public workingHours!: string;
  public isOpen!: boolean;
  public distance?: string;
  public image?: string;
  public image3d?: string;
  /** Разделы характеристик: [{ section, rows: [{ label, value }] }] */
  public characteristics?: unknown;
  public createdAt!: Date;
  public updatedAt!: Date;

  public getInstitution!: BelongsToGetAssociationMixin<Institution>;
}

Equipment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    institutionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'institutions',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    description: {
      type: DataTypes.TEXT,
    },
    workingHours: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isOpen: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    distance: {
      type: DataTypes.STRING,
    },
    image: {
      type: DataTypes.STRING,
    },
    image3d: {
      type: DataTypes.STRING,
    },
    characteristics: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
  },
  {
    sequelize,
    tableName: 'equipment',
    timestamps: true,
  }
);

Equipment.belongsTo(Institution, { foreignKey: 'institutionId' });

export default Equipment;
