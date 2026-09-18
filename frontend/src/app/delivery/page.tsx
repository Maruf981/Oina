"use client";

import { useEffect, useState } from "react";
import { BackButton } from "../back-button";
import { useRouter } from "next/navigation";
import { translations, Lang } from "../translations";

export default function DeliveryPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<Lang>("ru");
  const t = translations[lang];

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
    const savedLang = localStorage.getItem("lang") as Lang | null;
    if (savedLang) setLang(savedLang);
  }, []);

  return (
    <div data-theme={theme} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 20px" }}>
        <div style={{ marginBottom: 30 }}>
          <BackButton href="/" />
        </div>

        <h1 className="product-title" style={{ fontSize: 32, marginBottom: 40 }}>
          {t.footerDelivery}
        </h1>

        {lang === "ru" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <section>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Доставка</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                Мы доставляем по всему Таджикистану. По Душанбе доставка занимает 24 часа.
                За пределы Душанбе заказ отправляется через третьих лиц — первую доставку
                каждого товара оплачиваем мы, для клиента она бесплатна.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Оплата</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                По Душанбе авторизованным клиентам доступна оплата при получении. Также можно оплатить картой или через QR-код прямо на сайте. Заказы за пределы Душанбе оплачиваются полностью заранее — картой или через QR-код.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Возврат и обмен</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                По Душанбе: если товар не подошёл, вы можете отказаться от него прямо при получении
                или обменять на другой размер или цвет — бесплатно. За пределами Душанбе мы оплачиваем
                доставку каждого товара один раз, а возврат, обмен и любые повторные отправки — за счёт клиента.
              </p>
            </section>

            <section>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>Примерка двух размеров</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
              При оформлении заказа напишите в комментарии, что нужно привезти два размера — ваш и на один больше или меньше. Курьер привезёт оба варианта, и вы оставите себе подходящего.
            </p>
            </section>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <section>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Расонидан</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                Молҳои фармоишшударо, мо ба тамоми Тоҷикистон мерасонем. Дар ҳудуди шаҳри Душанбе расонидан,
                24 соатро дарбар мегирад. Берун аз шаҳри Душанбе фармоиш тавассути шахсони сеюм
                фиристода мешавад — расонидани аввалини ҳар як молро мо пардохт мекунем, барои мизоҷ ройгон аст.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Пардохт</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                Дар Душанбе барои мизоҷони воридшуда пардохт ҳангоми қабул дастрас аст. Инчунин метавонед бо корт ё тавассути QR-код мустақиман дар сайт пардохт кунед. Фармоишҳо берун аз Душанбе пешакӣ пурра пардохт карда мешаванд — бо корт ё тавассути QR-код.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Баргардонидан ва иваз кардан</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                Дар Душанбе: агар мол мувофиқ набошад, шумо метавонед онро ҳангоми қабул рад кунед
                ё бо андоза ё ранги дигар иваз намоед — ройгон. Берун аз Душанбе мо расонидани ҳар як молро
                як маротиба пардохт мекунем, баргардонидан, иваз ва ҳар гуна фиристодани такрорӣ — аз ҳисоби мизоҷ.
              </p>
            </section>

            <section>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>Санҷиши ду андоза</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
              Ҳангоми расмикунонии фармоиш дар шарҳ нависед, ки ду андоза оварда шавад — андозаи шумо ва як андоза калонтар ё хурдтар. Курьер ҳарду вариантро меорад ва Шумо мувофиқашро интихоб менамоед.
            </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
