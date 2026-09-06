import { DataTypes, Model, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../config/database';
import Equipment from './Equipment';

/** Промокод на оборудование — кнопка «Забрать промокод» на карточке */
class Promocode extends Model {
  public id!: string;
  public equipmentId?: string;
  public code!: string;
  public title!: string;
  public description?: string;
  public discount?: number;
  public expiresAt?: Date;
  public isActive!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  public getEquipment!: BelongsToGetAssociationMixin<Equipment>;
}

Promocode.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    equipmentId: {
      type: DataTypes.UUID,
      references: {
        model: 'equipment',
        key: 'id',
      },
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    discount: {
      type: DataTypes.INTEGER,
    },
    expiresAt: {
      type: DataTypes.DATE,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'promocodes',
    timestamps: true,
  }
);

Promocode.belongsTo(Equipment, { foreignKey: 'equipmentId' });

export default Promocode;
