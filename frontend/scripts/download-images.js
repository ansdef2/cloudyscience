// Скрипт для создания placeholder изображений
// Реальные изображения нужно добавить вручную из Unsplash, Pexels и т.д.

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const equipmentDir = path.join(publicDir, 'equipment');
const institutionDir = path.join(publicDir, 'institution');

// Создаем директории
[equipmentDir, institutionDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Создаем SVG placeholder'ы
const createSVGPlaceholder = (width, height, text, bgColor = '#1f1f1f', textColor = '#6b6b6b') => {
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="${textColor}" 
        text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>`;
};

const images = [
  { path: path.join(equipmentDir, 'oculus-rift.jpg'), text: 'Oculus Rift CV1', width: 800, height: 600 },
  { path: path.join(equipmentDir, 'milling-machine.jpg'), text: 'Milling Machine', width: 800, height: 600 },
  { path: path.join(equipmentDir, 'milling-machine-2.jpg'), text: 'Milling Machine 2', width: 800, height: 600 },
  { path: path.join(publicDir, 'profile.jpg'), text: 'Profile', width: 200, height: 200 },
  { path: path.join(institutionDir, 'kvantorium-1.jpg'), text: 'Kvantorium', width: 1200, height: 600 },
  { path: path.join(publicDir, 'computer.jpg'), text: 'Computer', width: 600, height: 400 },
  { path: path.join(publicDir, 'equipment.jpg'), text: 'Equipment', width: 600, height: 400 },
];

console.log('Создаю SVG placeholder изображения...\n');

images.forEach(({ path: filePath, text, width, height }) => {
  const svg = createSVGPlaceholder(width, height, text);
  const svgPath = filePath.replace(/\.(jpg|png)$/, '.svg');
  
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ Создан: ${path.relative(publicDir, svgPath)}`);
});

console.log('\n✓ Готово!');
console.log('\nИнструкции:');
console.log('1. Замените SVG файлы на реальные изображения из:');
console.log('   - Unsplash (https://unsplash.com)');
console.log('   - Pexels (https://www.pexels.com)');
console.log('   - Pixabay (https://pixabay.com)');
console.log('2. Используйте формат JPG или PNG');
console.log('3. Оптимизируйте изображения для веба');
