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

// Подписи характеристик для UI: в SQLite колонки названы по-английски
const PRINTER_LABELS: Record<string, string> = {
  printing_technology: 'Технология печати',
  build_volume: 'Область печати',
  layer_resolution: 'Разрешение слоя',
  positional_precision: 'Точность позиционирования',
  materials: 'Материалы',
  filament_diameter: 'Диаметр прутка',
  nozzle_diameter: 'Диаметр сопла',
  print_speed: 'Скорость печати',
  travel_speed: 'Скорость перемещения',
  notes: 'Примечания',
};

const SCANNER_LABELS: Record<string, string> = {
  manufacturer: 'Производитель',
  technology: 'Технология',
  dimensions: 'Габариты',
  max_size: 'Максимальный размер объекта',
  weight: 'Вес',
  resolution: 'Разрешение',
  precision: 'Точность',
  color_scanning: 'Цветное сканирование',
  export_formats: 'Форматы экспорта',
  software: 'Программное обеспечение',
  os_compatibility: 'Совместимость с ОС',
  power: 'Потребляемая мощность',
  notes: 'Примечания',
};

const VR_LABELS: Record<string, string> = {
  display_type: 'Тип дисплея',
  resolution_per_eye: 'Разрешение на глаз',
  total_resolution: 'Общее разрешение',
  pixel_density: 'Плотность пикселей',
  screen_size: 'Диагональ экрана',
  refresh_rate: 'Частота обновления',
  supported_refresh_rates: 'Поддерживаемые частоты',
  response_time: 'Время отклика',
  fov: 'Угол обзора',
  gyroscope: 'Гироскоп',
  accelerometer: 'Акселерометр',
  magnetometer: 'Магнитометр',
  infrared_tracking: 'Инфракрасный трекинг',
  tracker_camera_rate: 'Частота камеры трекинга',
  audio_type: 'Тип аудио',
  audio_output: 'Аудиовыход',
  video_input: 'Видеовход',
  usb_ports: 'USB-порты',
  power: 'Питание',
  shell_weight: 'Вес корпуса',
  total_weight: 'Общий вес',
  fit: 'Посадка',
  controller: 'Контроллер',
  tracking_type: 'Тип трекинга',
  dof: 'Степени свободы',
  max_distance: 'Максимальная дистанция',
  os_required: 'ОС (минимум)',
  cpu_required: 'Процессор (минимум)',
  ram_required: 'Оперативная память (минимум)',
  gpu_required: 'Видеокарта (минимум)',
  recommended_os: 'ОС (рекомендуется)',
  recommended_cpu: 'Процессор (рекомендуется)',
  recommended_ram: 'Оперативная память (рекомендуется)',
  recommended_gpu: 'Видеокарта (рекомендуется)',
  recommended_usb_ports: 'USB-порты (рекомендуется)',
};

const SPEC_TABLES: Array<{ table: string; labels: Record<string, string> }> = [
  { table: 'model_printers', labels: PRINTER_LABELS },
  { table: 'model_scanners', labels: SCANNER_LABELS },
  { table: 'model_vr', labels: VR_LABELS },
];

type CatalogEntry = {
  id: number;
  group: string;
  name: string;
  notes: string;
  characteristics: Record<string, string>;
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
      characteristics: {},
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

      for (const [column, label] of Object.entries(labels)) {
        const value = record[column];
        // Пустые ячейки в характеристики не попадают
        if (value === null || value === undefined || String(value).trim() === '') continue;
        entry.characteristics[label] = String(value).trim();
      }
    }
  }

  db.close();
  return [...entries.values()];
};

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
