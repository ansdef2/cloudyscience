import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

/**
 * Где лежат загруженные файлы. В Docker это том cloudco_uploads
 * (см. deploy/docker-compose.*.yml): файлы переживают пересборку образа.
 */
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
export const PRIVATE_DIR = path.join(UPLOAD_DIR, 'private');
export const PUBLIC_DIR = path.join(UPLOAD_DIR, 'public');

for (const dir of [PRIVATE_DIR, PUBLIC_DIR]) fs.mkdirSync(dir, { recursive: true });

const MB = 1024 * 1024;

/** Файлы к брони: модели, программы для станков, чертежи, архивы */
export const BOOKING_FILE_EXTENSIONS = [
  '.stl', '.obj', '.3mf', '.amf', '.ply', '.fbx', '.glb', '.gltf', '.blend', '.f3d',
  '.step', '.stp', '.iges', '.igs', '.dxf', '.dwg', '.svg',
  '.gcode', '.gco', '.nc', '.tap', '.ngc',
  '.png', '.jpg', '.jpeg', '.webp', '.pdf', '.txt', '.md', '.csv', '.json',
  '.ino', '.py', '.c', '.cpp', '.h', '.zip', '.7z', '.rar',
];
export const BOOKING_FILE_MAX_SIZE = 50 * MB;
export const BOOKING_FILES_MAX = 10;

/** Картинки: аватары, фото оборудования, обложки постов. SVG нельзя — в нём бывает скрипт */
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
export const IMAGE_MAX_SIZE = 8 * MB;

const extensionOf = (name: string) => path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g, '');

const storage = (dir: string) =>
  multer.diskStorage({
    destination: dir,
    // Имя на диске — случайное: исходное имя хранится только в базе
    filename: (_req, file, done) => done(null, `${crypto.randomUUID()}${extensionOf(file.originalname)}`),
  });

class UploadRejected extends Error {
  status = 400;
}

const allowOnly = (extensions: string[], label: string) =>
  ((_req, file, done) => {
    if (extensions.includes(extensionOf(file.originalname))) return done(null, true);
    done(new UploadRejected(`Этот тип файла не поддерживается. Можно: ${label}`));
  }) as multer.Options['fileFilter'];

export const bookingFileUpload = multer({
  storage: storage(PRIVATE_DIR),
  // Без этого кириллические имена файлов приходят «кракозябрами»
  defParamCharset: 'utf8',
  limits: { fileSize: BOOKING_FILE_MAX_SIZE, files: 1 },
  fileFilter: allowOnly(BOOKING_FILE_EXTENSIONS, 'модели, G-код, чертежи, изображения, PDF и архивы'),
} as multer.Options).single('file');

export const imageUpload = multer({
  storage: storage(PUBLIC_DIR),
  defParamCharset: 'utf8',
  limits: { fileSize: IMAGE_MAX_SIZE, files: 1 },
  fileFilter: allowOnly(IMAGE_EXTENSIONS, 'PNG, JPG, WEBP, GIF'),
} as multer.Options).single('file');

/** Картинка ли это на самом деле, а не переименованный HTML */
export const looksLikeImage = (filePath: string) => {
  const head = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, head, 0, 12, 0);
  } finally {
    fs.closeSync(fd);
  }
  const hex = head.toString('hex');
  return (
    hex.startsWith('89504e47') || // PNG
    hex.startsWith('ffd8ff') || // JPEG
    hex.startsWith('47494638') || // GIF
    (hex.startsWith('52494646') && head.subarray(8, 12).toString() === 'WEBP')
  );
};

export const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export const removeStoredFile = (dir: string, storedName: string) =>
  fs.promises.unlink(path.join(dir, path.basename(storedName))).catch(() => undefined);
