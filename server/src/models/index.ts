import User from './User';
import Institution from './Institution';
import Course from './Course';
import Equipment from './Equipment';
import Booking from './Booking';
import Post from './Post';
import Specialist from './Specialist';

// Define associations
Institution.hasMany(Course, { foreignKey: 'institutionId', as: 'courses' });
Course.belongsTo(Institution, { foreignKey: 'institutionId' });

Institution.hasMany(Equipment, { foreignKey: 'institutionId', as: 'equipment' });
Equipment.belongsTo(Institution, { foreignKey: 'institutionId' });

User.hasMany(Post, { foreignKey: 'authorId', as: 'posts' });

Institution.hasMany(Specialist, { foreignKey: 'institutionId', as: 'specialists' });
Specialist.belongsTo(Institution, { foreignKey: 'institutionId' });

export { User, Institution, Course, Equipment, Booking, Post, Specialist };
