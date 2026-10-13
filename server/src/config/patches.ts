import { Op, QueryTypes, Transaction } from 'sequelize';
import sequelize from './database';
import Booking from '../models/Booking';
import Course from '../models/Course';
import CourseEnrollment from '../models/CourseEnrollment';
import Institution from '../models/Institution';

/**
 * Разовые правки данных на работающей базе.
 *
 * Сид пересоздаёт таблицы, поэтому на продакшене его не запускают; схему
 * доводит sequelize.sync({ alter: true }), а содержимое — эти патчи.
 * Каждый выполняется один раз: его id записывается в data_patches
 * в той же транзакции, что и сама правка.
 *
 * Новый патч добавляется в конец списка; старые не правятся и не удаляются.
 */
interface DataPatch {
  id: string;
  run: (transaction: Transaction) => Promise<string>;
}

/** Курс, на который ведётся запись с главного экрана */
export const MAIN_COURSE_TITLE = 'Проектное управление и информационные технологии';
export const MAIN_COURSE_SPOTS = 30;

/**
 * Точки учреждений на Большой Московской (Великий Новгород).
 * Координаты ориентировочные, по номеру дома; уточнить их по геокодеру
 * можно скриптом deploy/geocode-institutions.py.
 */
export const INSTITUTION_COORDINATES: { address: string; latitude: number; longitude: number }[] = [
  { address: 'Большая Московская ул., 39', latitude: 58.5163, longitude: 31.2968 },
  { address: 'Большая Московская ул., 126', latitude: 58.5062, longitude: 31.3161 },
];

const PATCHES: DataPatch[] = [
  {
    id: '2026-10-institution-coordinates',
    run: async (transaction) => {
      let updated = 0;
      const institutions = await Institution.findAll({ transaction });

      for (const institution of institutions) {
        // Координаты, уже выставленные руками, не трогаем
        if (institution.latitude != null && institution.longitude != null) continue;

        const match = INSTITUTION_COORDINATES.find((item) =>
          institution.address?.startsWith(item.address)
        );
        if (!match) continue;

        await institution.update(
          { latitude: match.latitude, longitude: match.longitude },
          { transaction }
        );
        updated += 1;
      }

      return `координаты проставлены у ${updated} учреждений`;
    },
  },
  {
    id: '2026-10-course-enrollments',
    run: async (transaction) => {
      // Раньше на курс «записывались» бронью с courseId. Эти люди уже считают
      // себя записанными — переносим их в course_enrollments, по одной строке на пару
      const bookings = await Booking.findAll({
        where: { courseId: { [Op.ne]: null }, status: { [Op.ne]: 'cancelled' } },
        order: [['createdAt', 'ASC']],
        transaction,
      });

      const seen = new Set<string>();
      const rows = bookings
        .filter((booking) => {
          const key = `${booking.userId}:${booking.courseId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((booking) => ({
          userId: booking.userId,
          courseId: booking.courseId!,
          createdAt: booking.createdAt,
        }));

      if (rows.length) {
        await CourseEnrollment.bulkCreate(rows, { ignoreDuplicates: true, transaction });
      }

      const course = await Course.findOne({ where: { title: MAIN_COURSE_TITLE }, transaction });
      if (!course) {
        return `перенесено записей: ${rows.length}; курс «${MAIN_COURSE_TITLE}» не найден`;
      }

      const taken = await CourseEnrollment.count({ where: { courseId: course.id }, transaction });
      await course.update(
        { totalSpots: MAIN_COURSE_SPOTS, availableSpots: Math.max(0, MAIN_COURSE_SPOTS - taken) },
        { transaction }
      );

      return `перенесено записей: ${rows.length}; мест на курсе ${MAIN_COURSE_SPOTS}, занято ${taken}`;
    },
  },
];

export const applyDataPatches = async () => {
  await sequelize.query(
    'CREATE TABLE IF NOT EXISTS data_patches (id VARCHAR(255) PRIMARY KEY, "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())'
  );

  const applied = await sequelize.query<{ id: string }>('SELECT id FROM data_patches', {
    type: QueryTypes.SELECT,
  });
  const appliedIds = new Set(applied.map((row) => row.id));

  for (const patch of PATCHES) {
    if (appliedIds.has(patch.id)) continue;

    try {
      const summary = await sequelize.transaction(async (transaction) => {
        const result = await patch.run(transaction);
        await sequelize.query('INSERT INTO data_patches (id) VALUES (:id)', {
          replacements: { id: patch.id },
          transaction,
        });
        return result;
      });
      console.log(`Патч данных ${patch.id}: ${summary}`);
    } catch (error) {
      // Неудачный патч откатывается целиком и повторится при следующем старте;
      // сервер при этом поднимается, чтобы сайт не лёг из-за правки данных
      console.error(`Патч данных ${patch.id} не применён:`, error);
    }
  }
};
