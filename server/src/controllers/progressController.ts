import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import CourseEnrollment from '../models/CourseEnrollment';
import CourseModule from '../models/CourseModule';
import ModuleStage from '../models/ModuleStage';
import StageProgress from '../models/StageProgress';
import { sendError } from '../utils/sendError';

/** Отметить этап пройденным или снять отметку. Доступно только записанным на курс. */
export const setStageProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { stageId } = req.params;
    const completed = req.body?.completed !== false;

    const stage = await ModuleStage.findByPk(stageId, {
      include: [{ model: CourseModule, as: 'module', attributes: ['courseId'] }],
    });
    if (!stage) {
      return res.status(404).json({ error: 'Этап не найден' });
    }

    const courseId: string = (stage as any).module.courseId;
    const enrollment = await CourseEnrollment.findOne({
      where: { userId: req.user.id, courseId },
    });
    if (!enrollment) {
      return res.status(403).json({
        error: 'Запишитесь на курс, чтобы отмечать прогресс',
        code: 'NOT_ENROLLED',
      });
    }

    const where = { userId: req.user.id, stageId };

    if (completed) {
      // Повторная отметка не должна падать на уникальном индексе
      await StageProgress.findOrCreate({ where, defaults: { ...where } });
    } else {
      await StageProgress.destroy({ where });
    }

    // Отметки только этого курса: страница курса заменяет ими свой список целиком
    const marks = await StageProgress.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: ModuleStage,
          attributes: [],
          required: true,
          include: [{ model: CourseModule, as: 'module', attributes: [], where: { courseId } }],
        },
      ],
    });
    res.json({ completedStageIds: marks.map((mark) => mark.stageId) });
  } catch (error: any) {
    sendError(res, error);
  }
};
