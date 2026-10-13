import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import Team from './Team';
import User from './User';

/**
 * Приглашение в команду. Раньше создатель добавлял человека сразу —
 * теперь человек сам принимает или отклоняет приглашение.
 */
class TeamInvitation extends Model {
  public id!: string;
  public teamId!: string;
  public inviterId!: string;
  public inviteeId!: string;
  public status!: 'pending' | 'accepted' | 'declined' | 'cancelled';
  public createdAt!: Date;
  public updatedAt!: Date;
}

TeamInvitation.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    teamId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'teams', key: 'id' },
      onDelete: 'CASCADE',
    },
    inviterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    inviteeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'declined', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
  },
  { sequelize, tableName: 'team_invitations', timestamps: true }
);

TeamInvitation.belongsTo(Team, { foreignKey: 'teamId' });
TeamInvitation.belongsTo(User, { foreignKey: 'inviterId', as: 'inviter' });
TeamInvitation.belongsTo(User, { foreignKey: 'inviteeId', as: 'invitee' });

export default TeamInvitation;
