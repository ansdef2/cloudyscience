import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import multer from 'multer';
import { AuthRequest } from '../middleware/auth';
import Booking from '../models/Booking';
import FileUpload from '../models/FileUpload';
import TeamMember from '../models/TeamMember';
import {
  bookingFileUpload,
  BOOKING_FILE_MAX_SIZE,
  imageUpload,
  IMAGE_MAX_SIZE,
  looksLikeImage,
  MIME_BY_EXTENSION,
  PRIVATE_DIR,
  PUBLIC_DIR,
  removeStoredFile,
} from '../config/uploads';
import { sendError } from '../utils/sendError';

const MB = 1024 * 1024;

export const publicFileUrl = (storedName: string) => `/api/files/${storedName}`;

const describe = (file: FileUpload) => ({
  id: file.id,
  name: file.originalName,
  size: file.size,
  mimeType: file.mimeType,
  bookingId: file.bookingId ?? null,
  createdAt: file.createdAt,
  ...(file.visibility === 'public' ? { url: publicFileUrl(file.storedName) } : {}),
});

/** Ошибки multer — понятным текстом и кодом 400/413 */
const runUpload =
  (middleware: (req: Request, res: Response, next: NextFunction) => void, maxSize: number) =>
  (req: Request, res: Response, next: NextFunction) =>
    middleware(req, res, (error?: unknown) => {
      if (!error) return next();
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: `Файл больше ${Math.round(maxSize / MB)} МБ` });
        }
        return res.status(400).json({ error: 'Загружайте по одному файлу в поле file' });
      }
      const status = (error as { status?: number }).status ?? 500;
      res.status(status).json({ error: error instanceof Error ? error.message : 'Не удалось загрузить файл' });
    });

export const receiveBookingFile = runUpload(bookingFileUpload, BOOKING_FILE_MAX_SIZE);
export const receiveImage = runUpload(imageUpload, IMAGE_MAX_SIZE);

/** Файл к будущей брони: пока не прикреплён, виден только загрузившему */
export const uploadBookingFile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Прикрепите файл в поле file' });

    const file = await FileUpload.create({
      ownerId: req.user.id,
      visibility: 'private',
      originalName: req.file.originalname.slice(0, 255),
      storedName: req.file.filename,
      mimeType: req.file.mimetype || 'application/octet-stream',
      size: req.file.size,
    });
    res.status(201).json(describe(file));
  } catch (error) {
    if (req.file) await removeStoredFile(PRIVATE_DIR, req.file.filename);
    sendError(res, error);
  }
};

/** Сохраняет картинку в публичную папку; вызывающий решает, куда записать адрес */
export const storeImage = async (req: AuthRequest) => {
  if (!req.file) throw Object.assign(new Error('Прикрепите картинку в поле file'), { status: 400 });

  if (!looksLikeImage(req.file.path)) {
    await removeStoredFile(PUBLIC_DIR, req.file.filename);
    throw Object.assign(new Error('Файл не похож на картинку'), { status: 400 });
  }

  return FileUpload.create({
    ownerId: req.user.id,
    visibility: 'public',
    originalName: req.file.originalname.slice(0, 255),
    storedName: req.file.filename,
    mimeType: MIME_BY_EXTENSION[path.extname(req.file.filename)] ?? 'application/octet-stream',
    size: req.file.size,
  });
};

/** Картинка для каталога или поста — загружает администратор */
export const uploadImage = async (req: AuthRequest, res: Response) => {
  try {
    const file = await storeImage(req);
    res.status(201).json(describe(file));
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status) return res.status(status).json({ error: (error as Error).message });
    sendError(res, error);
  }
};

/**
 * Кто видит файл брони: тот, кто загрузил, участники команды брони
 * и администратор — те же, кто видит саму бронь.
 */
const canAccess = async (file: FileUpload, req: AuthRequest) => {
  if (req.user.role === 'admin' || file.ownerId === req.user.id) return true;
  if (!file.bookingId) return false;
  const booking = await Booking.findByPk(file.bookingId, { attributes: ['userId', 'teamId'] });
  if (!booking) return false;
  if (booking.userId === req.user.id) return true;
  return (
    !!booking.teamId && !!(await TeamMember.findOne({ where: { teamId: booking.teamId, userId: req.user.id } }))
  );
};

export const downloadFile = async (req: AuthRequest, res: Response) => {
  try {
    const file = await FileUpload.findByPk(req.params.id);
    // Чужой файл неотличим от несуществующего
    if (!file || file.visibility !== 'private' || !(await canAccess(file, req))) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    const filePath = path.join(PRIVATE_DIR, path.basename(file.storedName));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл не найден на диске' });

    // Всегда как вложение и без угадывания типа: файл не откроется как страница сайта
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.attachment(file.originalName);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    sendError(res, error);
  }
};

/** Удалить можно свой ещё не прикреплённый файл; администратор — любой */
export const deleteFile = async (req: AuthRequest, res: Response) => {
  try {
    const file = await FileUpload.findByPk(req.params.id);
    if (!file || (file.ownerId !== req.user.id && req.user.role !== 'admin')) {
      return res.status(404).json({ error: 'Файл не найден' });
    }
    if (file.bookingId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Файл уже прикреплён к брони' });
    }

    await file.destroy();
    await removeStoredFile(file.visibility === 'public' ? PUBLIC_DIR : PRIVATE_DIR, file.storedName);
    res.json({ message: 'Файл удалён' });
  } catch (error) {
    sendError(res, error);
  }
};

/** Публичные картинки — без входа, с долгим кэшем: имя файла уникально */
export const servePublicFile = (req: Request, res: Response) => {
  const name = path.basename(req.params.name);
  const type = MIME_BY_EXTENSION[path.extname(name).toLowerCase()];
  const filePath = path.join(PUBLIC_DIR, name);
  if (!type || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл не найден' });

  res.setHeader('Content-Type', type);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  fs.createReadStream(filePath).pipe(res);
};

/**
 * Прикрепить загруженные файлы к брони. Берутся только свои
 * и ещё ничьи — чужой файл id-шником к своей брони не утащить.
 */
export const attachFilesToBooking = async (
  fileIds: unknown,
  ownerId: string,
  bookingId: string,
  transaction?: import('sequelize').Transaction
) => {
  const ids = Array.isArray(fileIds) ? fileIds.filter((id): id is string => typeof id === 'string') : [];
  if (!ids.length) return [];

  const files = await FileUpload.findAll({
    where: { id: { [Op.in]: ids }, ownerId, bookingId: null, visibility: 'private' },
    transaction,
  });
  await FileUpload.update(
    { bookingId },
    { where: { id: { [Op.in]: files.map((file) => file.id) } }, transaction }
  );
  return files;
};

/** Файлы, которые так и не прикрепили к брони, удаляются через сутки */
export const cleanupOrphanUploads = async () => {
  const stale = await FileUpload.findAll({
    where: {
      bookingId: null,
      visibility: 'private',
      createdAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  for (const file of stale) {
    await file.destroy();
    await removeStoredFile(PRIVATE_DIR, file.storedName);
  }
  if (stale.length) console.log(`Удалено неприкреплённых файлов: ${stale.length}`);
};

export const startUploadCleanup = () => {
  const run = () => cleanupOrphanUploads().catch((error) => console.error('Чистка файлов:', error.message));
  setTimeout(run, 60 * 1000).unref();
  setInterval(run, 60 * 60 * 1000).unref();
};

export { describe as describeUpload };
