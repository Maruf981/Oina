const fs = require('fs');
const file = 'frontend/src/app/product/[id]/product-detail.tsx';
let code = fs.readFileSync(file, 'utf8');

// Точно находим блок выбора количества и кнопок покупки
const startMarker = 'style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}';
const startIdx = code.indexOf(startMarker);

const endMarker = '{lang === "ru" ? "Оформить заказ" : "Пардохти фармоиш"}';
const endIdx = code.indexOf(endMarker);
const finishIdx = code.indexOf('</div>', endIdx) + 6;

if (startIdx === -1 || endIdx === -1) {
  console.error('Ошибка: элементы не найдены');
  process.exit(1);
}

const buyBlock = code.slice(startIdx, finishIdx);
// Вырезаем со старого места
code = code.slice(0, startIdx) + code.slice(finishIdx);

// Находим место вставки в левой колонке (перед закрывающим тегом левого блока div)
// Ориентируемся по началу правой колонки
const rightColMarker = 'style={{ flex: 1, minWidth: 280 }}';
const rightIdx = code.indexOf(rightColMarker);
const insertIdx = code.lastIndexOf('</div>', rightIdx);

const wrapped = `\n              <div style={{ marginTop: 20, maxWidth: "80%" }}>\n                ${buyBlock}\n              </div>\n`;

code = code.slice(0, insertIdx) + wrapped + code.slice(insertIdx);

fs.writeFileSync(file, code);
console.log('✓ Блок успешно перемещен!');
