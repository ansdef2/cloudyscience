import sequelize from './database';
import '../models';
import User from '../models/User';
import Institution from '../models/Institution';
import Course from '../models/Course';
import Equipment from '../models/Equipment';
import Post from '../models/Post';
import Specialist from '../models/Specialist';
import Promocode from '../models/Promocode';
import { hashPassword } from '../utils/hashPassword';
import { importEquipmentModels } from './importEquipmentModels';

const seedDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Sync models
    await sequelize.sync({ force: true });
    console.log('Database synced.');

    // Create admin user
    const hashedPassword = await hashPassword('admin123');
    const adminUser = await User.create({
      email: 'admin@cloudco.ru',
      password: hashedPassword,
      name: 'Администратор',
      role: 'admin',
    });
    console.log('Admin user created:', adminUser.email);

    // Create test user
    const testUserPassword = await hashPassword('user123');
    const testUser = await User.create({
      email: 'user@cloudco.ru',
      password: testUserPassword,
      name: 'Тестовый Пользователь',
      role: 'user',
    });
    console.log('Test user created:', testUser.email);

    // Create institutions
    const institution1 = await Institution.create({
      name: 'ГОАУ Новгородский Кванториум',
      address: 'Большая Московская ул., 39, корп. 1',
      workingHours: '9:00-19:00',
      phone: '+7 (8162) 63-79-55',
      website: 'https://kvantorium53.ru',
      logo: '/institution/kvantorium-1.jpg',
      images: ['/institution/kvantorium-1.jpg'],
      isOpen: true,
    });

    const institution2 = await Institution.create({
      name: 'Центр дополнительного образования',
      address: 'Большая Московская ул., 126, корп. 3',
      workingHours: '10:00-17:00',
      phone: '+7 (8162) 12-34-56',
      website: 'https://example.ru',
      logo: '/institution/center-1.jpg',
      images: ['/institution/center-1.jpg'],
      isOpen: true,
    });

    // Create courses
    const course1 = await Course.create({
      institutionId: institution1.id,
      title: 'Информационные технологии и проектная деятельность',
      direction: 'IT Квантум',
      description: 'Интересуетесь наукой и техникой? Собираетесь стать великим создателем игр? Мечтаете освоить новейшие информационные технологии, игровые движки, хотите собрать собственные VR очки, создать свою первую 3D-модель или научиться обрабатывать панорамные видеоролики? Всё это у нас!',
      images: ['/courses/it-cube.jpg'],
      totalSpots: 20,
      availableSpots: 2,
    });

    const course2 = await Course.create({
      institutionId: institution1.id,
      title: 'Виртуальная и дополненная реальность',
      direction: 'VR/AR Квантум',
      description: 'Освойте технологии виртуальной и дополненной реальности, создавайте immersive-приложения и изучайте работу с современными VR/AR-платформами.',
      images: ['/courses/vr-ar.jpg'],
      totalSpots: 15,
      availableSpots: 3,
    });

    // Create equipment
    const equipment1 = await Equipment.create({
      institutionId: institution2.id,
      name: 'Фрезерный станок',
      type: 'Фрезерный станок',
      description: 'Современный фрезерный станок для обработки различных материалов',
      workingHours: '10:00-17:00',
      isOpen: true,
      distance: '1.26 км от вас',
      image: '/equipment/milling-machine.jpg',
      characteristics: [
        {
          section: 'Характеристики',
          rows: [
            { label: 'Рабочее поле', value: '400 x 300 x 100 мм' },
            { label: 'Материалы', value: 'Дерево, пластик, алюминий' },
            { label: 'Точность', value: '0.01 мм' },
          ],
        },
      ],
    });

    const equipment2 = await Equipment.create({
      institutionId: institution2.id,
      name: '3D принтер',
      type: '3D - Принтер',
      description: 'Профессиональный 3D принтер для создания объемных объектов',
      workingHours: '10:00-17:00',
      isOpen: false,
      distance: '1.26 км от вас',
      image: '/equipment/3d-printer.jpg',
      characteristics: [
        {
          section: 'Характеристики',
          rows: [
            { label: 'Область печати', value: '220 x 220 x 250 мм' },
            { label: 'Технология', value: 'FDM' },
            { label: 'Материалы', value: 'PLA, ABS, PETG' },
          ],
        },
      ],
    });

    const equipment3 = await Equipment.create({
      institutionId: institution1.id,
      name: 'Компьютерный класс',
      type: 'Компьютер',
      description: 'Оснащенный современным оборудованием компьютерный класс',
      workingHours: '9:00-19:00',
      isOpen: true,
      image: '/equipment/computer-class.jpg',
      characteristics: [
        {
          section: 'Характеристики',
          rows: [
            { label: 'Рабочих мест', value: '12' },
            { label: 'ПО', value: 'CAD, Unity, Blender' },
          ],
        },
      ],
    });

    // Реальный парк оборудования из data/models.db — поверх демо-позиций выше
    const importedModels = await importEquipmentModels();
    console.log(`Импортировано из справочника: ${importedModels}`);

    // Авторы ленты
    const authorPassword = await hashPassword('anton123');
    const anton = await User.create({
      email: 'anton@cloudco.ru',
      password: authorPassword,
      name: 'Антон',
      avatar: '/avatars/anton.jpg',
      role: 'user',
    });

    const masha = await User.create({
      email: 'masha@cloudco.ru',
      password: await hashPassword('masha123'),
      name: 'Маша',
      avatar: '/avatars/masha.jpg',
      role: 'user',
    });

    // Лента на главной: обычные посты и «Актуальное» (isFeatured)
    await Post.create({
      authorId: anton.id,
      title: 'Apple выпустила научную работу The Illusion of Thinking',
      text: 'В ней двигают мысль, что большие модели — не такие уж и умные.',
      image: '/posts/illusion-of-thinking.jpg',
      likes: 224,
      publishedAt: new Date(),
    });

    await Post.create({
      authorId: anton.id,
      title: 'В Кванториуме обновили парк 3D-принтеров',
      text: 'Три новых Wanhao Duplicator уже доступны для брони через приложение.',
      image: '/posts/printers-update.jpg',
      likes: 142,
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    });

    await Post.create({
      authorId: masha.id,
      title: 'Как собрать первую VR-сцену за вечер',
      text: 'Короткий гайд для тех, кто впервые берёт шлем в аренду.',
      image: '/posts/vr-guide.jpg',
      likes: 318,
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    });

    await Post.create({
      authorId: masha.id,
      title: 'Маша',
      text: 'Актуальное с занятий VR/AR Квантума',
      image: '/highlights/masha.jpg',
      likes: 12,
      isFeatured: true,
      publishedAt: new Date(),
    });

    await Post.create({
      authorId: anton.id,
      title: 'Антон',
      text: 'Актуальное из мастерской',
      image: '/highlights/anton.jpg',
      likes: 34,
      isFeatured: true,
      publishedAt: new Date(),
    });

    // Специалисты — вкладка «По специалистам» в поиске
    await Specialist.create({
      institutionId: institution1.id,
      name: 'Антон Кузнецов',
      position: 'Наставник VR/AR Квантума',
      avatar: '/avatars/anton.jpg',
    });

    await Specialist.create({
      institutionId: institution1.id,
      name: 'Мария Орлова',
      position: 'Наставник IT Квантума',
      avatar: '/avatars/masha.jpg',
    });

    await Specialist.create({
      institutionId: institution2.id,
      name: 'Дмитрий Соколов',
      position: 'Инженер по 3D-печати',
      avatar: '/avatars/dmitry.jpg',
    });

    // Промокоды на оборудование — кнопка «Забрать промокод»
    const oculus = await Equipment.findOne({ where: { name: 'Oculus Rift CV1' } });
    if (oculus) {
      await Promocode.create({
        equipmentId: oculus.id,
        code: 'VR-FIRST-HOUR',
        title: 'Первый час аренды бесплатно',
        description: 'Действует на первую бронь шлема виртуальной реальности',
        discount: 100,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      });
    }

    const printer = await Equipment.findOne({ where: { name: 'UNI-PRINT-3D' } });
    if (printer) {
      await Promocode.create({
        equipmentId: printer.id,
        code: 'PRINT-20',
        title: 'Скидка 20% на печать',
        description: 'На любую бронь 3D-принтера в этом месяце',
        discount: 20,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      });
    }

    console.log('Seed data created successfully!');
    console.log(`Created ${await User.count()} users`);
    console.log(`Created ${await Institution.count()} institutions`);
    console.log(`Created ${await Course.count()} courses`);
    console.log(`Created ${await Equipment.count()} equipment`);
    console.log(`Created ${await Post.count()} posts`);
    console.log(`Created ${await Specialist.count()} specialists`);
    console.log(`Created ${await Promocode.count()} promocodes`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
