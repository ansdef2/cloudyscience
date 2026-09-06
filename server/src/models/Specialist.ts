import { DataTypes, Model, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../config/database';
import Institution from './Institution';

/** Специалист учреждения — вкладка «По специалистам» в поиске */
class Specialist extends Model {
  public id!: string;
  public institutionId?: string;
  public name!: string;
  public position?: string;
  public avatar?: string;
  public isAvailable!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  public getInstitution!: BelongsToGetAssociationMixin<Institution>;
}

Specialist.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    institutionId: {
      type: DataTypes.UUID,
      references: {
        model: 'institutions',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    position: {
      type: DataTypes.STRING,
    },
    avatar: {
      type: DataTypes.STRING,
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'specialists',
    timestamps: true,
  }
);

Specialist.belongsTo(Institution, { foreignKey: 'institutionId' });

export default Specialist;
