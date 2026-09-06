import sequelize from './database';
import '../models';
import User from '../models/User';
import Institution from '../models/Institution';
import Course from '../models/Course';
import Equipment from '../models/Equipment';
import { hashPassword } from '../utils/hashPassword';

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
      logo: '/placeholder.svg',
      images: ['/placeholder.svg', '/placeholder.svg', '/placeholder.svg'],
      isOpen: true,
    });

    const institution2 = await Institution.create({
      name: 'Центр дополнительного образования',
      address: 'Большая Московская ул., 126, корп. 3',
      workingHours: '10:00-17:00',
      phone: '+7 (8162) 12-34-56',
      website: 'https://example.ru',
      logo: '/placeholder.svg',
      images: ['/placeholder.svg'],
      isOpen: true,
    });

    // Create courses
    const course1 = await Course.create({
      institutionId: institution1.id,
      title: 'Информационные технологии и проектная деятельность',
      direction: 'IT Квантум',
      description: 'Интересуетесь наукой и техникой? Собираетесь стать великим создателем игр? Мечтаете освоить новейшие информационные технологии, игровые движки, хотите собрать собственные VR очки, создать свою первую 3D-модель или научиться обрабатывать панорамные видеоролики? Всё это у нас!',
      images: ['/placeholder.svg'],
      totalSpots: 20,
      availableSpots: 2,
    });

    const course2 = await Course.create({
      institutionId: institution1.id,
      title: 'Виртуальная и дополненная реальность',
      direction: 'VR/AR Квантум',
      description: 'Освойте технологии виртуальной и дополненной реальности, создавайте immersive-приложения и изучайте работу с современными VR/AR-платформами.',
      images: ['/placeholder.svg'],
      totalSpots: 15,
      availableSpots: 3,
    });

    // Create equipment
    const equipment1 = await Equipment.create({
      institutionId: institution2.id,
      name: 'Фрезерный станок',
      type: 'Станки',
      description: 'Современный фрезерный станок для обработки различных материалов',
      workingHours: '10:00-17:00',
      isOpen: true,
      distance: '1.26 км от вас',
      image: '/equipment/milling-machine.jpg',
      characteristics: {
        'Рабочее поле': '400 x 300 x 100 мм',
        'Материалы': 'Дерево, пластик, алюминий',
        'Точность': '0.01 мм',
      },
    });

    const equipment2 = await Equipment.create({
      institutionId: institution2.id,
      name: '3D принтер',
      type: 'Принтеры',
      description: 'Профессиональный 3D принтер для создания объемных объектов',
      workingHours: '10:00-17:00',
      isOpen: false,
      distance: '1.26 км от вас',
      image: '/equipment/oculus-rift.jpg',
      characteristics: {
        'Область печати': '220 x 220 x 250 мм',
        'Технология': 'FDM',
        'Материалы': 'PLA, ABS, PETG',
      },
    });

    const equipment3 = await Equipment.create({
      institutionId: institution1.id,
      name: 'Компьютерный класс',
      type: 'Компьютеры',
      description: 'Оснащенный современным оборудованием компьютерный класс',
      workingHours: '9:00-19:00',
      isOpen: true,
      image: '/computer.jpg',
      characteristics: {
        'Рабочих мест': '12',
        'ПО': 'CAD, Unity, Blender',
      },
    });

    console.log('Seed data created successfully!');
    console.log(`Created ${await User.count()} users`);
    console.log(`Created ${await Institution.count()} institutions`);
    console.log(`Created ${await Course.count()} courses`);
    console.log(`Created ${await Equipment.count()} equipment`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
