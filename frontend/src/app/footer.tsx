"use client";
import "./site-footer.css";
import { SocialLinks } from "./social-links";

import { useRouter } from "next/navigation";
import { translations, Lang } from "./translations";
import { useLang } from "./lang-context";
import { useTheme } from "./theme-context";
import { useAuth } from "./auth-context";

export function Footer({ lang }: { lang: Lang }) {
  const t = translations[lang];
  const router = useRouter();
  const { toggleLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const auth = useAuth();
  const tr = (ru: string, tj: string) => (lang === "ru" ? ru : tj);

  return (
    <footer className="ft">
      <div className="ft-top">
        <div className="ft-brand">
          <img className="ft-logo" src="/logo.png" alt="Oina.tj" onClick={() => router.push("/")} />
          <div className="ft-word">OINA</div>
          <p className="ft-about">{t.footerAbout}</p>
        </div>
        <div className="ft-social-box">
          <div className="ft-label">{tr("Мы в соцсетях", "Мо дар шабакаҳо")}</div>
          <div className="ft-social">
            <SocialLinks />
          </div>
        </div>
      </div>

      <div className="ft-cols">
        <div>
          <div className="ft-label">{t.footerLinks}</div>
          <span onClick={() => router.push("/faq")}>{t.footerFaq}</span>
          <span onClick={() => router.push("/delivery")}>{t.footerDelivery}</span>
          <span onClick={() => router.push("/terms")}>{t.footerTerms}</span>
          <span onClick={() => router.push("/privacy")}>{t.footerPrivacy}</span>
        </div>
        <div>
          <div className="ft-label">{tr("Покупки", "Харид")}</div>
          <span onClick={() => router.push("/")}>{tr("Все товары", "Ҳамаи молҳо")}</span>
          <span onClick={() => router.push("/recommended")}>{tr("Рекомендации", "Тавсияҳо")}</span>
          <span onClick={() => router.push("/favorites")}>{tr("Избранное", "Интихобҳо")}</span>
          <span onClick={() => router.push("/cart")}>{tr("Корзина", "Сабад")}</span>
        </div>
        <div>
          <div className="ft-label">{tr("Аккаунт", "Ҳисоб")}</div>
          <span onClick={() => router.push(auth.customer ? "/account" : "/?login=1")}>
            {auth.customer ? tr("Профиль", "Уток") : tr("Войти", "Даромадан")}
          </span>
          <span onClick={() => router.push("/orders")}>{tr("Мои заказы", "Фармоишҳои ман")}</span>
        </div>
        <div>
          <div className="ft-label">{tr("Настройки", "Танзимот")}</div>
          <span onClick={toggleLang}>
            <b className={lang === "ru" ? "is-on" : ""}>Русский</b> / <b className={lang === "tj" ? "is-on" : ""}>Тоҷикӣ</b>
          </span>
          <span onClick={toggleTheme}>
            {theme === "dark" ? tr("Светлая тема", "Мавзӯи равшан") : tr("Тёмная тема", "Мавзӯи торик")}
          </span>
        </div>
      </div>

      <div className="ft-bottom">
        <span>© {new Date().getFullYear()} Oina.tj — {t.footerRights}</span>
      </div>
    </footer>
  );
}
