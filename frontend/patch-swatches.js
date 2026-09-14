const fs = require('fs');
const file = 'frontend/src/app/product/[id]/product-detail.tsx';

let code = fs.readFileSync(file, 'utf8');

// 1. Находим старый блок маппинга цветов и заменяем на круглые свотчи
const targetStart = code.indexOf('{colors.map((color) => {');
const targetEnd = code.indexOf('})}</div>', targetStart) + 4;

if (targetStart === -1 || targetEnd === -1) {
  console.error('Ошибка: блок цветов не найден');
  process.exit(1);
}

const newSwatches = `{colors.map((color) => {
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

code = code.slice(0, targetStart) + newSwatches + code.slice(targetEnd);

// 2. Добавляем вывод выбранного цвета в заголовок
code = code.replace(
  /\{lang === "ru" \? "Цвет" : "Ранг"\}/g,
  `{lang === "ru" ? "Цвет" : "Ранг"}{selectedColor ? \`: \${selectedColor}\` : ""}`
);

fs.writeFileSync(file, code);
console.log('✓ Круглые свотчи успешно возвращены!');
