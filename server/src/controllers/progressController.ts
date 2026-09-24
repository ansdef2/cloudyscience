import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ModuleStage from '../models/ModuleStage';
import StageProgress from '../models/StageProgress';
import { sendError } from '../utils/sendError';

/** Отметить этап пройденным или снять отметку. */
export const setStageProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { stageId } = req.params;
    const completed = req.body?.completed !== false;

    const stage = await ModuleStage.findByPk(stageId);
    if (!stage) {
      return res.status(404).json({ error: 'Этап не найден' });
    }

    const where = { userId: req.user.id, stageId };

    if (completed) {
      // Повторная отметка не должна падать на уникальном индексе
      await StageProgress.findOrCreate({ where, defaults: { ...where } });
    } else {
      await StageProgress.destroy({ where });
    }

    const marks = await StageProgress.findAll({ where: { userId: req.user.id } });
    res.json({ completedStageIds: marks.map((mark) => mark.stageId) });
  } catch (error: any) {
    sendError(res, error);
  }
};
