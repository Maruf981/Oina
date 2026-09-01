"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { translations, Lang } from "../translations";
import { Footer } from "../footer";

const faqItemsRu = [
  {
    q: "Как оформить заказ?",
    a: "Выберите товар, размер и цвет, добавьте в корзину и оформите заказ, указав адрес доставки и телефон.",
  },
  {
    q: "Какие способы оплаты доступны?",
    a: "Оплата картой или через QR-код прямо на сайте при оформлении заказа.",
  },
  {
    q: "В какие города вы доставляете?",
    a: "По всему Таджикистану. Доставка за пределы Душанбе осуществляется третьими лицами (за ваш счёт).",
  },
  {
    q: "Сколько времени занимает доставка?",
    a: "Обычно 24 часов с момента подтверждения заказа.",
  },
  {
    q: "Можно ли вернуть или обменять товар?",
    a: "Да. Если товар не подошёл, вы можете отказаться от него прямо при получении. Обмен на другой размер или цвет возможен с доплатой 10 сомони за повторную доставку.",
  },
  {
    q: "Можно ли заказать сразу два размера, чтобы примерить?",
    a: "Да можно. Вы сможете указать два размера при заказе, курьер привезёт оба, и вы оставите себе подходящий.",
  },
];

const faqItemsTj = [
  {
    q: "Чӣ тавр фармоиш диҳам?",
    a: "Молро, андоза ва рангро интихоб карда, ба сабад илова кунед, сипас фармоишро бо суроға ва телефон пур кунед.",
  },
  {
    q: "Кадом усулҳои пардохт мавҷуданд?",
    a: "Пардохт бо корт ё тавассути QR-код мустақиман дар сомона ҳангоми фармоиш.",
  },
  {
    q: "Ба кадом шаҳрҳо расонида мешавад?",
    a: "Ба тамоми минтақаҳои Ҷумҳурии Тоҷикистон. Расонидани молҳо берун аз шаҳри Душанбе тавассути шахсони сеюм (аз ҳисоби Шумо) анҷом дода мешавад.",
  },
  {
    q: "Расонидан чанд вақт мегирад?",
    a: "Одатан давоми 24 соат пас аз тасдиқи фармоиш.",
  },
  {
    q: "Оё баргардонидан ё иваз кардани мол имконпазир аст?",
    a: "Бале. Агар мол мувофиқ набошад, шумо метавонед онро ҳангоми қабул рад кунед. Иваз кардан бо андозаи ё ранги дигар бо пардохти иловагии 10 сомонӣ барои расонидани такрорӣ имконпазир аст.",
  },
  {
    q: "Оё метавонам якбора ду андоза фармоиш диҳам, то пробакунам?",
    a: "Бале. Шумо метавонед ҳангоми фармоиш ду андозаро нишон диҳед, курьер ҳарду оварда, Шумо мувофиқашро нигоҳ медоред.",
  },
];

export default function FaqPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<Lang>("ru");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const t = translations[lang];

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
    const savedLang = localStorage.getItem("lang") as Lang | null;
    if (savedLang) setLang(savedLang);
  }, []);

  const items = lang === "ru" ? faqItemsRu : faqItemsTj;

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
          {t.footerFaq}
        </h1>

        <div>
          {items.map((item, idx) => (
            <div key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
              <div
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                style={{
                  padding: "20px 0",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 16,
                }}
              >
                <span>{item.q}</span>
                <span style={{ fontSize: 20, color: "var(--text-muted)" }}>{openIndex === idx ? "−" : "+"}</span>
              </div>
              {openIndex === idx && (
                <p style={{ paddingBottom: 20, color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      <Footer lang={lang} />
    </div>
  );
}
