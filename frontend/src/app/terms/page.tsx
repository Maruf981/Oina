"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { translations, Lang } from "../translations";
import { Footer } from "../footer";

export default function TermsPage() {
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
          {t.footerTerms}
        </h1>

        {lang === "ru" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
            <p>
              Используя сайт Oina.tj, вы соглашаетесь с настоящими условиями. Если вы не согласны
              с какими-либо пунктами, пожалуйста, не используйте сайт.
            </p>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Оформление заказа</h2>
              <p>
                Оформляя заказ на сайте, вы подтверждаете, что указанные данные (имя, телефон, адрес)
                верны. Мы связываемся с покупателем по указанному телефону для подтверждения заказа.
              </p>
            </section>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Цены и наличие товара</h2>
              <p>
                Цены на сайте указаны в сомони и могут быть изменены без предварительного уведомления.
                Наличие товара на складе может отличаться от отображаемого на сайте.
              </p>
            </section>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Ответственность</h2>
              <p>
                Oina.tj прилагает все усилия для точного отображения товаров, однако цвет и внешний
                вид товара на фотографии может немного отличаться от реального из-за особенностей
                экрана устройства.
              </p>
            </section>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Изменения условий</h2>
              <p>
                Мы можем время от времени обновлять эти условия. Актуальная версия всегда доступна
                на этой странице.
              </p>
            </section>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
            <p>
              Бо истифодаи сайти Oina.tj, шумо бо ин шартҳо розӣ мешавед. Агар шумо бо ягон банд
              розӣ набошед, лутфан сайтро истифода набаред.
            </p>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Фармоиш додан</h2>
              <p>
                Ҳангоми фармоиш додан дар сайт, шумо тасдиқ мекунед, ки маълумоти нишондодашуда
                (ном, телефон, суроға) дуруст аст. Мо бо харидор тавассути телефони нишондодашуда
                барои тасдиқи фармоиш тамос мегирем.
              </p>
            </section>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Нархҳо ва мавҷудияти мол</h2>
              <p>
                Нархҳо дар сайт бо сомонӣ нишон дода шудаанд ва бидуни огоҳии пешакӣ тағйир ёфта метавонанд.
                Мавҷудияти мол дар анбор аз он чи дар сайт нишон дода мешавад фарқ карда метавонад.
              </p>
            </section>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Масъулият</h2>
              <p>
                Oina.tj ҳама кӯшишро ба харҷ медиҳад, то молҳоро дуруст нишон диҳад, аммо ранг ва
                намуди беруна дар акс метавонад аз мол дар воқеият каме фарқ кунад, зеро ин ба
                хусусиятҳои экрани дастгоҳ вобаста аст.
              </p>
            </section>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Тағйироти шартҳо</h2>
              <p>
                Мо метавонем ин шартҳоро вақт ба вақт нав кунем. Нусхаи ҷорӣ ҳамеша дар ин саҳифа
                дастрас аст.
              </p>
            </section>
          </div>
        )}
      </div>
      <Footer lang={lang} />
    </div>
  );
}
