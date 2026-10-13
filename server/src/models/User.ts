import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export type ParentConsentStatus = 'not_required' | 'pending' | 'confirmed';

class User extends Model {
  public id!: string;
  public email!: string;
  public password!: string;
  public name!: string;
  public avatar?: string | null;
  public role!: 'user' | 'admin';
  /** Растёт при смене пароля: выданные раньше токены перестают действовать */
  public tokenVersion!: number;
  public birthDate?: string | null;
  /** Когда и какую редакцию политики и соглашения человек принял */
  public consentAt?: Date | null;
  public consentVersion?: string | null;
  /** Детям до 14 лет нужно согласие родителя на обработку данных */
  public parentName?: string | null;
  public parentEmail?: string | null;
  public parentConsentStatus!: ParentConsentStatus;
  public parentConsentAt?: Date | null;
  /** Заблокирован администратором: войти и писать нельзя */
  public isBlocked!: boolean;
  public blockedReason?: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
    },
    tokenVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    birthDate: {
      type: DataTypes.DATEONLY,
    },
    consentAt: {
      type: DataTypes.DATE,
    },
    consentVersion: {
      type: DataTypes.STRING(32),
    },
    parentName: {
      type: DataTypes.STRING,
    },
    parentEmail: {
      type: DataTypes.STRING,
    },
    parentConsentStatus: {
      type: DataTypes.ENUM('not_required', 'pending', 'confirmed'),
      allowNull: false,
      defaultValue: 'not_required',
    },
    parentConsentAt: {
      type: DataTypes.DATE,
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    blockedReason: {
      type: DataTypes.STRING(500),
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
  }
);

export default User;
