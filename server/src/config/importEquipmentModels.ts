/**
 * Импорт справочника оборудования из data/models.db (SQLite) в Postgres.
 *
 * Исходная база — выгрузка реального парка: таблица models_general содержит
 * физические единицы (у Wanhao и «Гелиос» разные заводские номера), а
 * характеристики разложены по таблицам под каждый тип. Здесь единицы
 * становятся записями Equipment, а характеристики — полем characteristics.
 *
 * Запуск: npm run db:import-models
 */
import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import sequelize from './database';
import '../models';
import Equipment from '../models/Equipment';
import Institution from '../models/Institution';

const DB_PATH = path.resolve(__dirname, '../../data/models.db');

/**
 * Подписи и группировка характеристик под таблицу на карточке оборудования.
 * Колонка SQLite -> [раздел, подпись]. Названия разделов и подписи взяты
 * из макета, порядок колонок задаёт порядок строк в разделе.
 */
type LabelMap = Record<string, [string, string]>;

const PRINTER_LABELS: LabelMap = {
  printing_technology: ['Характеристики печати', 'Технология печати'],
  build_volume: ['Характеристики печати', 'Область печати'],
  layer_resolution: ['Характеристики печати', 'Разрешение слоя'],
  positional_precision: ['Характеристики печати', 'Точность позиционирования'],
  print_speed: ['Характеристики печати', 'Скорость печати'],
  travel_speed: ['Характеристики печати', 'Скорость перемещения'],
  materials: ['Расходные материалы', 'Материалы'],
  filament_diameter: ['Расходные материалы', 'Диаметр прутка'],
  nozzle_diameter: ['Расходные материалы', 'Диаметр сопла'],
  notes: ['Дополнительно', 'Примечания'],
};

const SCANNER_LABELS: LabelMap = {
  manufacturer: ['Общие сведения', 'Производитель'],
  technology: ['Общие сведения', 'Технология'],
  resolution: ['Характеристики сканирования', 'Разрешение'],
  precision: ['Характеристики сканирования', 'Точность'],
  max_size: ['Характеристики сканирования', 'Максимальный размер объекта'],
  color_scanning: ['Характеристики сканирования', 'Цветное сканирование'],
  dimensions: ['Физические характеристики', 'Габариты'],
  weight: ['Физические характеристики', 'Вес'],
  power: ['Физические характеристики', 'Потребляемая мощность'],
  export_formats: ['Программное обеспечение', 'Форматы экспорта'],
  software: ['Программное обеспечение', 'Программное обеспечение'],
  os_compatibility: ['Программное обеспечение', 'Совместимость с ОС'],
  notes: ['Дополнительно', 'Примечания'],
};

const VR_LABELS: LabelMap = {
  display_type: ['Дисплей и оптика', 'Тип матрицы'],
  resolution_per_eye: ['Дисплей и оптика', 'Разрешение на каждый глаз'],
  total_resolution: ['Дисплей и оптика', 'Общее разрешение'],
  pixel_density: ['Дисплей и оптика', 'Плотность пикселей'],
  screen_size: ['Дисплей и оптика', 'Диагональ дисплея'],
  refresh_rate: ['Дисплей и оптика', 'Частота обновления'],
  supported_refresh_rates: ['Дисплей и оптика', 'Поддерживаемые частоты'],
  response_time: ['Дисплей и оптика', 'Время отклика'],
  fov: ['Дисплей и оптика', 'Угол обзора (FOV)'],
  gyroscope: ['Датчики', 'Гироскоп'],
  accelerometer: ['Датчики', 'Акселерометр'],
  magnetometer: ['Датчики', 'Магнитометр'],
  infrared_tracking: ['Датчики', 'Инфракрасные датчики'],
  tracker_camera_rate: ['Датчики', 'Частота опроса камеры трекера'],
  audio_type: ['Аудио', 'Тип наушников'],
  audio_output: ['Аудио', 'Аудиовыход'],
  video_input: ['Подключение', 'Видеовыход'],
  usb_ports: ['Подключение', 'USB порты'],
  power: ['Подключение', 'Питание'],
  shell_weight: ['Физические характеристики', 'Вес шлема'],
  total_weight: ['Физические характеристики', 'Вес (общий вариант)'],
  fit: ['Физические характеристики', 'Регулировка'],
  controller: ['Комплектация', 'Контроллер'],
  tracking_type: ['Система отслеживания', 'Тип отслеживания'],
  dof: ['Система отслеживания', 'Степени свободы (DoF)'],
  max_distance: ['Система отслеживания', 'Максимальное расстояние'],
  os_required: ['Минимальные системные требования', 'ОС'],
  cpu_required: ['Минимальные системные требования', 'Процессор'],
  ram_required: ['Минимальные системные требования', 'Оперативная память'],
  gpu_required: ['Минимальные системные требования', 'Видеокарта'],
  recommended_os: ['Рекомендуемые системные требования', 'ОС'],
  recommended_cpu: ['Рекомендуемые системные требования', 'Процессор'],
  recommended_ram: ['Рекомендуемые системные требования', 'Оперативная память'],
  recommended_gpu: ['Рекомендуемые системные требования', 'Видеокарта'],
  recommended_usb_ports: ['Рекомендуемые системные требования', 'USB порты'],
};

const SPEC_TABLES: Array<{ table: string; labels: LabelMap }> = [
  { table: 'model_printers', labels: PRINTER_LABELS },
  { table: 'model_scanners', labels: SCANNER_LABELS },
  { table: 'model_vr', labels: VR_LABELS },
];

/** Раздел характеристик; массив, а не объект, чтобы JSONB сохранил порядок */
type SpecSection = {
  section: string;
  rows: Array<{ label: string; value: string }>;
};

type CatalogEntry = {
  id: number;
  group: string;
  name: string;
  notes: string;
  characteristics: SpecSection[];
};

/** Читает справочник из SQLite-файла */
export const readCatalog = async (): Promise<CatalogEntry[]> => {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Файл справочника не найден: ${DB_PATH}`);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const entries = new Map<number, CatalogEntry>();

  const general = db.exec('SELECT id, model_group, model_name, notes FROM models_general');
  for (const row of general[0]?.values ?? []) {
    const id = Number(row[0]);
    entries.set(id, {
      id,
      group: String(row[1] ?? '').trim(),
      name: String(row[2] ?? '').trim(),
      notes: String(row[3] ?? '').trim(),
      characteristics: [],
    });
  }

  // Характеристики лежат в отдельной таблице под каждый тип, id общий с models_general
  for (const { table, labels } of SPEC_TABLES) {
    const result = db.exec(`SELECT * FROM ${table}`);
    if (!result[0]) continue;

    const { columns, values } = result[0];
    for (const row of values) {
      const record = Object.fromEntries(columns.map((c, i) => [c, row[i]]));
      const entry = entries.get(Number(record.id));
      if (!entry) continue;

      // Порядок разделов и строк повторяет порядок колонок в LabelMap
      for (const [column, [section, label]] of Object.entries(labels)) {
        const value = record[column];
        // Пустые ячейки в характеристики не попадают
        if (value === null || value === undefined || String(value).trim() === '') continue;

        let target = entry.characteristics.find((item) => item.section === section);
        if (!target) {
          target = { section, rows: [] };
          entry.characteristics.push(target);
        }
        target.rows.push({ label, value: String(value).trim() });
      }
    }
  }

  db.close();
  return [...entries.values()];
};

/**
 * Изображения по типу оборудования: в справочнике их нет.
 * Пути соответствуют файлам из frontend/public.
 */
const IMAGE_BY_GROUP: Array<{ match: string; image: string }> = [
  { match: 'принтер', image: '/equipment/3d-printer.jpg' },
  { match: 'сканер', image: '/equipment/3d-scanner.jpg' },
  { match: 'шлем', image: '/equipment/oculus-rift.jpg' },
];

const imageForGroup = (group: string): string | undefined =>
  IMAGE_BY_GROUP.find((item) => group.toLowerCase().includes(item.match))?.image;

/**
 * Раскладка по учреждениям: в самом справочнике привязки нет.
 * VR и сканеры — в Кванториум, печать — в центр дополнительного образования.
 */
const institutionForGroup = (group: string): 'kvantorium' | 'additional' =>
  group.toLowerCase().includes('принтер') ? 'additional' : 'kvantorium';

/**
 * Переносит справочник в таблицу equipment. Повторный запуск обновляет
 * уже импортированные позиции, а не плодит дубликаты.
 */
export const importEquipmentModels = async (): Promise<number> => {
  const catalog = await readCatalog();

  const institutions = await Institution.findAll({ order: [['createdAt', 'ASC']] });
  if (institutions.length === 0) {
    throw new Error('Нет ни одного учреждения — сначала выполните npm run db:seed');
  }

  const kvantorium =
    institutions.find((i) => i.name.toLowerCase().includes('кванториум')) ?? institutions[0];
  const additional =
    institutions.find((i) => i.id !== kvantorium.id) ?? kvantorium;

  let imported = 0;

  for (const entry of catalog) {
    const institution =
      institutionForGroup(entry.group) === 'additional' ? additional : kvantorium;

    const attributes = {
      institutionId: institution.id,
      name: entry.name,
      type: entry.group,
      description: entry.notes,
      workingHours: institution.workingHours,
      isOpen: true,
      image: imageForGroup(entry.group),
      characteristics: entry.characteristics,
    };

    const existing = await Equipment.findOne({ where: { name: entry.name } });
    if (existing) {
      await existing.update(attributes);
    } else {
      await Equipment.create(attributes);
    }
    imported += 1;
  }

  return imported;
};

// Запуск как отдельного скрипта
if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      await sequelize.sync({ alter: true });

      const count = await importEquipmentModels();
      console.log(`Импортировано позиций справочника: ${count}`);
      console.log(`Всего оборудования в базе: ${await Equipment.count()}`);
      process.exit(0);
    } catch (error) {
      console.error('Ошибка импорта справочника:', error);
      process.exit(1);
    }
  })();
}
