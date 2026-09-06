// Скрипт для загрузки шрифтов
// Запуск: node scripts/download-fonts.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, '../src/assets/fonts');

// Создаем директорию если не существует
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Onest уже подключен через Google Fonts, но можно скачать локально
// Для CalvinoDisplayItalic используем бесплатную альтернативу - Playfair Display

const fonts = [
  {
    name: 'PlayfairDisplay-Italic',
    url: 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay-Italic.ttf',
    filename: 'PlayfairDisplay-Italic.ttf'
  }
];

async function downloadFont(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✓ Загружен: ${path.basename(filepath)}`);
          resolve();
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Редирект
        file.close();
        fs.unlinkSync(filepath);
        downloadFont(response.headers.location, filepath).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`Ошибка загрузки: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
  });
}

async function main() {
  console.log('Начинаю загрузку шрифтов...\n');
  
  for (const font of fonts) {
    const filepath = path.join(fontsDir, font.filename);
    try {
      await downloadFont(font.url, filepath);
    } catch (error) {
      console.error(`✗ Ошибка загрузки ${font.name}:`, error.message);
    }
  }
  
  console.log('\nГотово!');
  console.log('\nПримечание:');
  console.log('- Onest уже подключен через Google Fonts');
  console.log('- Playfair Display используется как альтернатива CalvinoDisplayItalic');
  console.log('- Если у вас есть файл CalvinoDisplayItalic.woff2, поместите его в src/assets/fonts/');
}

main().catch(console.error);
