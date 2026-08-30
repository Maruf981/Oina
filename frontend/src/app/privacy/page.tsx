"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { translations, Lang } from "../translations";
import { Footer } from "../footer";

export default function PrivacyPage() {
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
          {t.footerPrivacy}
        </h1>

        {lang === "ru" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
            <p>
              Мы уважаем вашу конфиденциальность и обязуемся защищать личные данные, которые вы
              предоставляете при использовании сайта Oina.tj.
            </p>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Какие данные мы собираем</h2>
              <p>
                При оформлении заказа мы собираем ваше имя, номер телефона и адрес доставки.
                Эти данные используются исключительно для обработки и доставки заказа.
              </p>
            </section>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Использование данных</h2>
              <p>
                Ваши данные не передаются третьим лицам, за исключением случаев, необходимых для
                доставки заказа (например, службам такси при доставке за пределы Душанбе).
              </p>
            </section>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Хранение данных</h2>
              <p>
                Данные о заказах хранятся в защищённой базе данных и используются для истории
                покупок в вашем личном кабинете.
              </p>
            </section>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Ваши права</h2>
              <p>
                Вы можете запросить удаление своих данных, обратившись к нам через контакты,
                указанные на сайте.
              </p>
            </section>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
            <p>
              Мо махфияти шуморо эҳтиром мекунем ва ӯҳдадор мешавем, ки маълумоти шахсии шуморо,
              ки ҳангоми истифодаи сайти Oina.tj медиҳед, ҳифз кунем.
            </p>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Кадом маълумотро мо ҷамъ мекунем</h2>
              <p>
                Ҳангоми фармоиш додан, мо номи шумо, рақами телефон ва суроғаи расониданро ҷамъ мекунем.
                Ин маълумот танҳо барои коркард ва расонидани фармоиш истифода мешавад.
              </p>
            </section>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Истифодаи маълумот</h2>
              <p>
                Маълумоти шумо ба шахсони сеюм дода намешавад, ба истиснои мавридҳое, ки барои
                расонидани фармоиш зарур аст (масалан, хидматҳои такси ҳангоми расонидан берун аз Душанбе).
              </p>
            </section>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Нигоҳдории маълумот</h2>
              <p>
                Маълумот дар бораи фармоишҳо дар пойгоҳи додаҳои ҳифзшуда нигоҳ дошта мешавад ва
                барои таърихи харидҳо дар ҳисоби шахсии шумо истифода мешавад.
              </p>
            </section>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Ҳуқуқҳои шумо</h2>
              <p>
                Шумо метавонед хоҳиши нест кардани маълумоти худро талаб кунед, бо мо тавассути
                тамосҳои дар сайт нишондодашуда мурочиат кунед.
              </p>
            </section>
          </div>
        )}
      </div>
      <Footer lang={lang} />
    </div>
  );
}
