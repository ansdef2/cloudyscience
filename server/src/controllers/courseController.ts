import { Request, Response } from 'express';
import { Transaction } from 'sequelize';
import sequelize from '../config/database';
import Course from '../models/Course';
import CourseEnrollment from '../models/CourseEnrollment';
import Institution from '../models/Institution';
import CourseModule from '../models/CourseModule';
import ModuleStage from '../models/ModuleStage';
import StageProgress from '../models/StageProgress';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { Op } from 'sequelize';
import { sendError } from '../utils/sendError';
import { notify } from '../utils/notify';

/**
 * Свободные места считаются от записей, а не уменьшаются счётчиком:
 * так число не расходится с таблицей записей после ручных правок.
 */
export const syncAvailableSpots = async (course: Course, transaction?: Transaction) => {
  const taken = await CourseEnrollment.count({ where: { courseId: course.id }, transaction });
  const availableSpots = Math.max(0, (course.totalSpots ?? 0) - taken);
  if (course.availableSpots !== availableSpots) {
    await course.update({ availableSpots }, { transaction });
  }
  return availableSpots;
};

export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const { search, institutionId } = req.query;
    
    let whereClause: any = {};
    if (search) {
      whereClause = {
        [Op.or]: [
          { title: { [Op.iLike]: `%${search}%` } },
          { direction: { [Op.iLike]: `%${search}%` } },
        ],
      };
    }
    if (institutionId) {
      whereClause.institutionId = institutionId;
    }

    const courses = await Course.findAll({
      where: whereClause,
      include: [Institution],
      order: [['createdAt', 'DESC']],
    });

    res.json(courses);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const getCourseById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id, {
      include: [
        Institution,
        {
          model: CourseModule,
          as: 'modules',
          include: [{ model: ModuleStage, as: 'stages' }],
        },
      ],
      order: [
        [{ model: CourseModule, as: 'modules' }, 'order', 'ASC'],
        [{ model: CourseModule, as: 'modules' }, { model: ModuleStage, as: 'stages' }, 'order', 'ASC'],
      ],
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Прогресс виден только записанному на курс: гостю и незаписанному отмечать нечего
    let isEnrolled = false;
    let completedStageIds: string[] = [];
    if (req.user) {
      isEnrolled = !!(await CourseEnrollment.findOne({
        where: { userId: req.user.id, courseId: course.id },
      }));
    }

    if (isEnrolled) {
      const modules: CourseModule[] = (course as any).modules ?? [];
      const stageIds = modules.flatMap((module: any) =>
        (module.stages ?? []).map((stage: ModuleStage) => stage.id)
      );
      const marks = await StageProgress.findAll({
        where: { userId: req.user.id, stageId: { [Op.in]: stageIds } },
      });
      completedStageIds = marks.map((mark) => mark.stageId);
    }

    res.json({ ...course.toJSON(), isEnrolled, completedStageIds });
  } catch (error: any) {
    sendError(res, error);
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    // У нового курса записей нет: все места свободны
    const course = await Course.create({ ...req.body, availableSpots: req.body?.totalSpots ?? 0 });
    const courseWithInstitution = await Course.findByPk(course.id, {
      include: [Institution],
    });
    res.status(201).json(courseWithInstitution);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // availableSpots выводится из записей, вручную его не задают
    const { availableSpots: _ignored, ...changes } = req.body ?? {};
    await course.update(changes);
    await syncAvailableSpots(course);
    const updatedCourse = await Course.findByPk(id, {
      include: [Institution],
    });
    res.json(updatedCourse);
  } catch (error: any) {
    sendError(res, error);
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await course.destroy();
    res.json({ message: 'Course deleted successfully' });
  } catch (error: any) {
    sendError(res, error);
  }
};

/**
 * Записаться на курс. Одна запись на пользователя, не больше totalSpots на курс.
 * Строка курса блокируется на время транзакции: две одновременные записи
 * на последнее место встают в очередь, и вторая получает отказ.
 */
export const enrollInCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await sequelize.transaction(async (transaction) => {
      const course = await Course.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!course) {
        return { status: 404, body: { error: 'Курс не найден' } };
      }

      const existing = await CourseEnrollment.findOne({
        where: { userId, courseId: id },
        transaction,
      });
      if (existing) {
        return { status: 409, body: { error: 'Вы уже записаны на этот курс', code: 'ALREADY_ENROLLED' } };
      }

      const taken = await CourseEnrollment.count({ where: { courseId: id }, transaction });
      if (taken >= course.totalSpots) {
        await syncAvailableSpots(course, transaction);
        return { status: 409, body: { error: 'Свободных мест на курсе нет', code: 'NO_SPOTS' } };
      }

      await CourseEnrollment.create({ userId, courseId: id }, { transaction });
      const availableSpots = await syncAvailableSpots(course, transaction);

      return {
        status: 201,
        body: { isEnrolled: true, totalSpots: course.totalSpots, availableSpots },
      };
    });

    res.status(result.status).json(result.body);
  } catch (error: any) {
    // Гонка двух запросов одного пользователя мимо блокировки упрётся
    // в уникальный индекс — sendError превратит это в 409
    sendError(res, error);
  }
};

/** Снять пользователя с курса и вернуть место. Только для администратора. */
export const removeEnrollment = async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;

    const result = await sequelize.transaction(async (transaction) => {
      const course = await Course.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!course) {
        return { status: 404, body: { error: 'Курс не найден' } };
      }

      const removed = await CourseEnrollment.destroy({ where: { courseId: id, userId }, transaction });
      if (!removed) {
        return { status: 404, body: { error: 'Пользователь не записан на этот курс' } };
      }

      const availableSpots = await syncAvailableSpots(course, transaction);
      return { status: 200, body: { totalSpots: course.totalSpots, availableSpots }, title: course.title };
    });

    if (result.status === 200 && 'title' in result) {
      await notify(userId, {
        type: 'enrollment_removed',
        title: 'Вас сняли с курса',
        body: `«${result.title}». Если это ошибка — напишите администратору площадки.`,
        link: '/courses',
      });
    }

    res.status(result.status).json(result.body);
  } catch (error: any) {
    sendError(res, error);
  }
};

/** Список записавшихся — для администратора. */
export const getCourseEnrollments = async (req: Request, res: Response) => {
  try {
    const enrollments = await CourseEnrollment.findAll({
      where: { courseId: req.params.id },
      include: [{ model: User, attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'ASC']],
    });
    res.json(enrollments);
  } catch (error: any) {
    sendError(res, error);
  }
};

/** Все записи на все курсы — для админки */
export const getAllEnrollments = async (_req: Request, res: Response) => {
  try {
    const enrollments = await CourseEnrollment.findAll({
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: Course, attributes: ['id', 'title', 'totalSpots', 'availableSpots'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(enrollments);
  } catch (error: any) {
    sendError(res, error);
  }
};
