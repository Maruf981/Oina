const fs = require('fs');
const file = 'frontend/src/app/product/[id]/product-detail.tsx';

let code = fs.readFileSync(file, 'utf8');

// 1. Вырезаем блок покупки (Количество + Кнопки) из текущего места
const quantityDivMarker = 'style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}';
const startIdx = code.indexOf(quantityDivMarker);

const checkoutMarker = '{lang === "ru" ? "Оформить заказ" : "Пардохти фармоиш"}';
const checkoutIdx = code.indexOf(checkoutMarker);
const endIdx = code.indexOf('</div>', checkoutIdx) + 6;

if (startIdx === -1 || checkoutIdx === -1) {
  console.error('Ошибка: не удалось найти блок покупки');
  process.exit(1);
}

const buyBlockHtml = code.slice(startIdx, endIdx);
code = code.slice(0, startIdx) + code.slice(endIdx);

// 2. Вставляем блок покупки в левую колонку под галерею фото
// Ищем закрывающий тег основного контейнера фото (после миниатюр или под главным фото)
const targetGalleryMarker = '</div>\n            <div>';
const targetIdx = code.indexOf(targetGalleryMarker);

if (targetIdx === -1) {
  console.error('Ошибка: не удалось найти место вставки под фото');
  process.exit(1);
}

const insertPos = targetIdx + 6;
const wrappedBuyBlock = `\n              {/* Блок покупки под фото */}
              <div style={{ marginTop: 24, maxWidth: "85%" }}>
                ${buyBlockHtml}
              </div>`;

code = code.slice(0, insertPos) + wrappedBuyBlock + code.slice(insertPos);

fs.writeFileSync(file, code);
console.log('✓ Кнопки и количество успешно перенесены под фотографию');
