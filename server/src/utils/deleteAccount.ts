import crypto from 'crypto';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import Booking from '../models/Booking';
import ConsultationRequest from '../models/ConsultationRequest';
import Course from '../models/Course';
import CourseEnrollment from '../models/CourseEnrollment';
import FileUpload from '../models/FileUpload';
import Message from '../models/Message';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';
import User from '../models/User';
import UserToken from '../models/UserToken';
import { PRIVATE_DIR, PUBLIC_DIR, removeStoredFile } from '../config/uploads';
import { syncAvailableSpots } from '../controllers/courseController';
import { hashPassword } from './hashPassword';
import { siteNow, storedDate } from './schedule';

/**
 * Удаление аккаунта по просьбе человека (152-ФЗ, ст. 21).
 * Строку пользователя не удаляем — на неё ссылаются прошлые брони и посты, —
 * а обезличиваем: имя, почта, дата рождения, аватар, данные родителя
 * стираются, вход закрывается. Личная переписка и файлы удаляются,
 * будущие брони отменяются, места на курсах освобождаются, свои команды
 * переходят к другому участнику или удаляются, если он был один.
 */
export const deleteAccount = async (user: User) => {
  const files: { dir: string; name: string }[] = [];

  await sequelize.transaction(async (transaction) => {
    const owned = await Team.findAll({ where: { ownerId: user.id }, transaction });
    for (const team of owned) {
      const heir = await TeamMember.findOne({
        where: { teamId: team.id, userId: { [Op.ne]: user.id } },
        order: [['createdAt', 'ASC']],
        transaction,
      });
      if (heir) {
        await team.update({ ownerId: heir.userId }, { transaction });
        await heir.update({ role: 'owner' }, { transaction });
      } else {
        await team.destroy({ transaction });
      }
    }
    await TeamMember.destroy({ where: { userId: user.id }, transaction });

    await Message.destroy({
      where: { teamId: null, [Op.or]: [{ senderId: user.id }, { recipientId: user.id }] },
      transaction,
    });

    await Booking.update(
      { status: 'cancelled' },
      {
        where: {
          userId: user.id,
          status: { [Op.in]: ['pending', 'confirmed'] },
          date: { [Op.gte]: storedDate(siteNow().date) },
        },
        transaction,
      }
    );

    const enrollments = await CourseEnrollment.findAll({ where: { userId: user.id }, transaction });
    await CourseEnrollment.destroy({ where: { userId: user.id }, transaction });
    for (const courseId of new Set(enrollments.map((row) => row.courseId))) {
      const course = await Course.findByPk(courseId, { transaction, lock: transaction.LOCK.UPDATE });
      if (course) await syncAvailableSpots(course, transaction);
    }

    await ConsultationRequest.destroy({ where: { userId: user.id }, transaction });
    await UserToken.destroy({ where: { userId: user.id }, transaction });

    const uploads = await FileUpload.findAll({ where: { ownerId: user.id }, transaction });
    for (const file of uploads) {
      files.push({ dir: file.visibility === 'public' ? PUBLIC_DIR : PRIVATE_DIR, name: file.storedName });
    }
    await FileUpload.destroy({ where: { ownerId: user.id }, transaction });

    await user.update(
      {
        name: 'Удалённый пользователь',
        email: `deleted-${user.id}@deleted.invalid`,
        password: await hashPassword(crypto.randomBytes(32).toString('hex')),
        avatar: null,
        birthDate: null,
        parentName: null,
        parentEmail: null,
        isBlocked: true,
        blockedReason: 'Аккаунт удалён',
        tokenVersion: user.tokenVersion + 1,
      },
      { transaction }
    );
  });

  // Файлы — после фиксации: если транзакция откатится, они останутся на месте
  for (const file of files) await removeStoredFile(file.dir, file.name);
};
