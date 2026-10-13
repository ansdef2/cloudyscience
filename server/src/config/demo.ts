import { Op } from 'sequelize';
import sequelize from './database';
import Booking from '../models/Booking';
import Equipment from '../models/Equipment';
import Post from '../models/Post';
import Specialist from '../models/Specialist';
import User from '../models/User';

/**
 * Демо-наполнение из сида: посты от имени «Антона» и «Маши», вымышленные
 * эксперты и три демонстрационные позиции оборудования. Определяются по
 * точным значениям из seed.ts, чтобы не задеть ничего настоящего.
 * Убираются кнопкой в админке, когда появится своё содержимое.
 */
export const DEMO_AUTHOR_EMAILS = ['anton@cloudyscience.ru', 'masha@cloudyscience.ru'];
export const DEMO_SPECIALISTS = [
  { name: 'Антон Кузнецов', position: 'Наставник VR/AR Квантума' },
  { name: 'Мария Орлова', position: 'Наставник IT Квантума' },
  { name: 'Дмитрий Соколов', position: 'Инженер по 3D-печати' },
];
export const DEMO_EQUIPMENT_NAMES = ['Фрезерный станок', '3D принтер', 'Компьютерный класс'];

const findDemo = async () => {
  const authors = await User.findAll({ where: { email: { [Op.in]: DEMO_AUTHOR_EMAILS } }, attributes: ['id'] });
  const posts = await Post.findAll({
    where: { authorId: { [Op.in]: authors.map((author) => author.id) } },
    attributes: ['id', 'title'],
  });
  const specialists = await Specialist.findAll({
    where: { [Op.or]: DEMO_SPECIALISTS.map((item) => ({ name: item.name, position: item.position })) },
    attributes: ['id', 'name'],
  });
  // Демо-оборудование из сида не связано со справочником моделей: у него нет 3D-модели
  const equipment = await Equipment.findAll({
    where: { name: { [Op.in]: DEMO_EQUIPMENT_NAMES }, image3d: null },
    attributes: ['id', 'name'],
  });
  const withBookings = new Set(
    (
      await Booking.findAll({
        where: { equipmentId: { [Op.in]: equipment.map((item) => item.id) } },
        attributes: ['equipmentId'],
      })
    ).map((booking) => booking.equipmentId)
  );

  return {
    posts,
    specialists,
    equipment: equipment.filter((item) => !withBookings.has(item.id)),
    keptEquipment: equipment.filter((item) => withBookings.has(item.id)),
  };
};

export const previewDemo = async () => {
  const demo = await findDemo();
  return {
    posts: demo.posts.map((post) => post.title),
    specialists: demo.specialists.map((item) => item.name),
    equipment: demo.equipment.map((item) => item.name),
    keptEquipment: demo.keptEquipment.map((item) => item.name),
  };
};

export const removeDemo = async () => {
  const demo = await findDemo();
  await sequelize.transaction(async (transaction) => {
    await Post.destroy({ where: { id: { [Op.in]: demo.posts.map((post) => post.id) } }, transaction });
    await Specialist.destroy({
      where: { id: { [Op.in]: demo.specialists.map((item) => item.id) } },
      transaction,
    });
    await Equipment.destroy({ where: { id: { [Op.in]: demo.equipment.map((item) => item.id) } }, transaction });
  });
  return {
    posts: demo.posts.length,
    specialists: demo.specialists.length,
    equipment: demo.equipment.length,
  };
};
