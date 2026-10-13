import { Request, Response } from 'express';
import Course from '../models/Course';
import CourseModule from '../models/CourseModule';
import ModuleStage from '../models/ModuleStage';
import { sendError } from '../utils/sendError';

/**
 * Редактор содержания курса для администратора: модули и этапы.
 * Порядок задаётся полем order; новые встают в конец.
 */

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : undefined);
const lines = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : undefined;

const moduleFields = (body: any) => {
  const fields: Record<string, unknown> = {};
  for (const key of ['title', 'summary', 'goal', 'resultSummary'] as const) {
    if (body?.[key] !== undefined) fields[key] = text(body[key]) || (key === 'title' ? '' : null);
  }
  for (const key of ['outcomes', 'resultItems'] as const) {
    if (body?.[key] !== undefined) fields[key] = lines(body[key]) ?? [];
  }
  if (Number.isInteger(body?.order)) fields.order = body.order;
  return fields;
};

const stageFields = (body: any) => {
  const fields: Record<string, unknown> = {};
  for (const key of ['title', 'summary', 'outcome', 'theory'] as const) {
    if (body?.[key] !== undefined) fields[key] = text(body[key]) || (key === 'title' ? '' : null);
  }
  if (Number.isInteger(body?.order)) fields.order = body.order;
  return fields;
};

export const createModule = async (req: Request, res: Response) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ error: 'Курс не найден' });

    const fields = moduleFields(req.body);
    if (!fields.title) return res.status(400).json({ error: 'Нужно название модуля' });
    const last = (await CourseModule.max('order', { where: { courseId: course.id } })) as number | null;

    const module = await CourseModule.create({ order: (last ?? 0) + 1, ...fields, courseId: course.id });
    res.status(201).json(module);
  } catch (error) {
    sendError(res, error);
  }
};

export const updateModule = async (req: Request, res: Response) => {
  try {
    const module = await CourseModule.findByPk(req.params.moduleId);
    if (!module) return res.status(404).json({ error: 'Модуль не найден' });
    const fields = moduleFields(req.body);
    if (fields.title === '') return res.status(400).json({ error: 'Нужно название модуля' });
    await module.update(fields);
    res.json(module);
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteModule = async (req: Request, res: Response) => {
  try {
    const removed = await CourseModule.destroy({ where: { id: req.params.moduleId } });
    if (!removed) return res.status(404).json({ error: 'Модуль не найден' });
    res.json({ message: 'Модуль удалён вместе с этапами' });
  } catch (error) {
    sendError(res, error);
  }
};

export const createStage = async (req: Request, res: Response) => {
  try {
    const module = await CourseModule.findByPk(req.params.moduleId);
    if (!module) return res.status(404).json({ error: 'Модуль не найден' });

    const fields = stageFields(req.body);
    if (!fields.title) return res.status(400).json({ error: 'Нужно название этапа' });
    const last = (await ModuleStage.max('order', { where: { moduleId: module.id } })) as number | null;

    const stage = await ModuleStage.create({ order: (last ?? 0) + 1, ...fields, moduleId: module.id });
    res.status(201).json(stage);
  } catch (error) {
    sendError(res, error);
  }
};

export const updateStage = async (req: Request, res: Response) => {
  try {
    const stage = await ModuleStage.findByPk(req.params.stageId);
    if (!stage) return res.status(404).json({ error: 'Этап не найден' });
    const fields = stageFields(req.body);
    if (fields.title === '') return res.status(400).json({ error: 'Нужно название этапа' });
    await stage.update(fields);
    res.json(stage);
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteStage = async (req: Request, res: Response) => {
  try {
    const removed = await ModuleStage.destroy({ where: { id: req.params.stageId } });
    if (!removed) return res.status(404).json({ error: 'Этап не найден' });
    res.json({ message: 'Этап удалён' });
  } catch (error) {
    sendError(res, error);
  }
};
