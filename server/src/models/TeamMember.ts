import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Team from './Team';
import User from './User';

/** Участие в команде. Создатель команды — owner, остальные — member */
class TeamMember extends Model {
  public id!: string;
  public teamId!: string;
  public userId!: string;
  public role!: 'owner' | 'member';
  public createdAt!: Date;
}

TeamMember.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    teamId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'teams', key: 'id' },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    role: { type: DataTypes.ENUM('owner', 'member'), defaultValue: 'member' },
  },
  {
    sequelize,
    tableName: 'team_members',
    timestamps: true,
    indexes: [{ unique: true, fields: ['teamId', 'userId'] }],
  }
);

TeamMember.belongsTo(User, { foreignKey: 'userId' });
TeamMember.belongsTo(Team, { foreignKey: 'teamId' });
Team.hasMany(TeamMember, { foreignKey: 'teamId', as: 'members' });

export default TeamMember;
