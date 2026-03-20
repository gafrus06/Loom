// scripts/generate-emoji-manifest.js
// Запускай: node scripts/generate-emoji-manifest.js
// Сканирует public/custom/*.tgs и создаёт src/assets/custom/manifest.json

const fs = require('fs');
const path = require('path');

const TGS_DIR      = path.join(__dirname, '../public/custom');
const MANIFEST_OUT = path.join(__dirname, '../src/assets/custom/manifest.json');

// Создаём папку если нет
if (!fs.existsSync(path.dirname(MANIFEST_OUT))) {
    fs.mkdirSync(path.dirname(MANIFEST_OUT), { recursive: true });
}

// Сканируем .tgs файлы
const files = fs.existsSync(TGS_DIR)
    ? fs.readdirSync(TGS_DIR).filter(f => f.endsWith('.tgs'))
    : [];

fs.writeFileSync(MANIFEST_OUT, JSON.stringify(files, null, 2));
console.log(`✅ manifest.json обновлён: ${files.length} tgs файлов`);
files.forEach(f => console.log(`   • ${f}`));