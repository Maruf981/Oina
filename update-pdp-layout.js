const fs = require('fs');
const file = 'frontend/src/app/product/[id]/product-detail.tsx';

let code = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file + '.bak', code);

// 1. Вырезаем оригинальный блок покупки (Количество + Кнопки) из правой колонки
const buyBlockStart = code.indexOf('<div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>');
const buyBlockEndMarker = 'setToastMessage(null), 3000);\n                    });\n                }}';
const afterToast = code.indexOf(buyBlockEndMarker);

if (buyBlockStart === -1 || afterToast === -1) {
  console.error('Ошибка: не удалось локализовать блок покупки');
  process.exit(1);
}

// Захватываем закрывающие теги кнопок
const buyBlockEnd = code.indexOf('</div>', code.indexOf('</button>', afterToast) + 9) + 6;
const buyBlockHtml = code.slice(buyBlockStart, buyBlockEnd);

// Удаляем блок покупки из правой колонки
code = code.slice(0, buyBlockStart) + code.slice(buyBlockEnd);

// 2. Вставляем блок покупки в левую колонку прямо под фото (после блока миниатюр/галереи)
// Ищем закрывающий div левой колонки (перед правой колонкой)
const rightColMarker = 'style={{ flex: 1, minWidth: 280 }}';
const rightColIdx = code.indexOf(rightColMarker);
const leftColCloseIdx = code.lastIndexOf('</div>', rightColIdx);

const styledBuyBlock = `\n              {/* Блок покупки перенесён под фото */}
              <div style={{ maxWidth: "75%", marginTop: 16 }}>
                ${buyBlockHtml}
              </div>\n`;

code = code.slice(0, leftColCloseIdx) + styledBuyBlock + code.slice(leftColCloseIdx);

// 3. Заменяем плашки цветов на круглые свотчи
const colorMapStart = code.indexOf('{colors.map((color) => {');
const colorMapEnd = code.indexOf('})}</div>', colorMapStart) + 4;

const newColorSwatches = `{colors.map((color) => {
                          const available = isColorAvailable(color);
                          const active = selectedColor === color;
                          const hex = getColorHex(color);
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => available && handleSelectColor(color)}
                              disabled={!available}
                              title={color}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                padding: 0,
                                background: hex,
                                border: "1px solid var(--line)",
                                outline: active ? "2px solid var(--text)" : "none",
                                outlineOffset: 2,
                                cursor: available ? "pointer" : "not-allowed",
                                opacity: available ? 1 : 0.35,
                                position: "relative",
                                transition: "transform 0.15s ease",
                                transform: active ? "scale(1.08)" : "none",
                              }}
                            />
                          );
                        })}`;

code = code.slice(0, colorMapStart) + newColorSwatches + code.slice(colorMapEnd);

// 4. Добавляем вывод названия цвета в заголовок блока (Цвет: Название)
code = code.replace(
  /\{lang === "ru" \? "Цвет" : "Ранг"\}/g,
  `{lang === "ru" ? "Цвет" : "Ранг"}{selectedColor ? \`: \${selectedColor}\` : ""}`
);

fs.writeFileSync(file, code);
console.log('✓ product-detail.tsx: плашки заменены на свотчи, кнопки перенесены под фото');
