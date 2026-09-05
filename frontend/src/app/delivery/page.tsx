"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { translations, Lang } from "../translations";
import { Footer } from "../footer";

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
        <span
          onClick={() => router.push("/")}
          style={{ cursor: "pointer", fontFamily: "var(--font-label)", fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 30 }}
        >
          ← {lang === "ru" ? "Главная" : "Асосӣ"}
        </span>

        <h1 className="product-title" style={{ fontSize: 32, marginBottom: 40 }}>
          {t.footerDelivery}
        </h1>

        {lang === "ru" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <section>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Доставка</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                Мы доставляем по всему Таджикистану. По Душанбе доставка занимает 24 часа.
                За пределы Душанбе заказ отправляется через третьих лиц за счёт клиента —
                стоимость проезда оплачивается получателем при получении.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Оплата</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                Оплата производится картой или через QR-код прямо на сайте при оформлении заказа.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Возврат и обмен</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                Если товар не подошёл, вы можете отказаться от него прямо при получении —
                возврат в этом случае бесплатный. Если нужен обмен на другой размер или цвет,
                повторная доставка оплачивается отдельно — доплата курьеру составляет 10 сомони.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Заказ нескольких размеров на примерку</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                Скоро на сайте появится возможность указать сразу два размера при заказе —
                курьер привезёт оба варианта, и вы оставите себе подходящий прямо на месте.
              </p>
            </section>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <section>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Расонидан</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                Молҳои фармоишшударо, мо ба тамоми Тоҷикистон мерасонем. Дар ҳудуди шаҳри Душанбе расонидан,
                24 соатро дарбар мегирад. Берун аз шаҳри Душанбе фармоиш тавассути шахсони сеюм аз ҳисоби мизоҷ
                фиристода мешавад — арзиши сафар аз ҷониби шахси қабулкунанда ҳангоми қабул пардохт мегардад.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Пардохт</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                Пардохт бо корт ё тавассути QR-код мустақиман дар сайт ҳангоми фармоиш анҷом дода мешавад.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Баргардонидан ва иваз кардан</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                Агар мол мувофиқ набошад, шумо метавонед онро мустақиман ҳангоми қабул рад кунед —
                дар ин ҳолат баргардонидан ройгон аст. Агар иваз кардан бо андоза ё ранги дигар лозим бошад,
                расонидани такрорӣ алоҳида пардохт мешавад — иловапулии курьер 10 сомонӣ мебошад.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Фармоиши якчанд андоза барои пробакунӣ</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                Ба зудӣ дар сайт имконияти нишон додани якбора ду андоза ҳангоми фармоиш пайдо мешавад —
                курьер ҳарду вариантро оварда медиҳад, ва шумо мувофиқашро мустақиман дар ҷо нигоҳ медоред.
              </p>
            </section>
          </div>
        )}
      </div>
      <Footer lang={lang} />
    </div>
  );
}
