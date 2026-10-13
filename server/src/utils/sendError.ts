import { Response } from 'express';
import {
  DatabaseError,
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError,
} from 'sequelize';
import { reportServerError } from './alerts';

/**
 * Ошибка в данных запроса — это 4xx, а не 5xx. Раньше все ошибки
 * отдавались как 500, и отсутствие обязательного поля выглядело
 * в логах неотличимо от падения сервера.
 */
export const sendError = (res: Response, error: unknown) => {
  // UniqueConstraintError наследует ValidationError, поэтому проверяется первым
  if (error instanceof UniqueConstraintError) {
    return res.status(409).json({
      error: 'Запись с такими данными уже существует',
      details: error.errors.map((item) => item.message),
    });
  }

  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: 'Некорректные данные',
      details: error.errors.map((item) => item.message),
    });
  }

  if (error instanceof ForeignKeyConstraintError) {
    return res.status(400).json({ error: 'Ссылка на несуществующую запись' });
  }

  // Неверный формат идентификатора в пути — тоже вина запроса, а не сервера
  if (error instanceof DatabaseError && /invalid input syntax/i.test(error.message)) {
    return res.status(400).json({ error: 'Некорректный формат идентификатора' });
  }

  const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';
  console.error('Необработанная ошибка:', error instanceof Error ? error.stack : message);
  reportServerError(error, `${res.req?.method ?? ''} ${res.req?.originalUrl ?? ''}`.trim());
  // Текст внутренней ошибки (SQL, пути) наружу не отдаём
  return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
};
