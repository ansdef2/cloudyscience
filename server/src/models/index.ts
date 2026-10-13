import User from './User';
import Institution from './Institution';
import Course from './Course';
import Equipment from './Equipment';
import Booking from './Booking';
import Post from './Post';
import Specialist from './Specialist';
import CourseModule from './CourseModule';
import ModuleStage from './ModuleStage';
import StageProgress from './StageProgress';
import CourseEnrollment from './CourseEnrollment';
import IotChannel from './IotChannel';
import Team from './Team';
import TeamMember from './TeamMember';
import Message from './Message';
import ConsultationRequest from './ConsultationRequest';
import FileUpload from './FileUpload';
import UserToken from './UserToken';
import Notification from './Notification';
import TeamInvitation from './TeamInvitation';
import Report from './Report';
import UserBlock from './UserBlock';

// Define associations
Institution.hasMany(Course, { foreignKey: 'institutionId', as: 'courses' });
Course.belongsTo(Institution, { foreignKey: 'institutionId' });

Institution.hasMany(Equipment, { foreignKey: 'institutionId', as: 'equipment' });
Equipment.belongsTo(Institution, { foreignKey: 'institutionId' });

User.hasMany(Post, { foreignKey: 'authorId', as: 'posts' });

Institution.hasMany(Specialist, { foreignKey: 'institutionId', as: 'specialists' });
Specialist.belongsTo(Institution, { foreignKey: 'institutionId' });

export {
  User,
  Institution,
  Course,
  Equipment,
  Booking,
  Post,
  Specialist,
  CourseModule,
  ModuleStage,
  StageProgress,
  CourseEnrollment,
  IotChannel,
  Team,
  TeamMember,
  Message,
  ConsultationRequest,
  FileUpload,
  UserToken,
  Notification,
  TeamInvitation,
  Report,
  UserBlock,
};
