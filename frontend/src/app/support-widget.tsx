"use client";

export function SupportWidget() {
  return (
    <a
      href="tg://resolve?domain=Oina_Assistant_bot"
      target="_blank"
      rel="noopener noreferrer"
      className="support-widget-button"
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: "#229ED9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        zIndex: 150,
        cursor: "pointer",
      }}
      aria-label="Написать в поддержку в Telegram"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
        <path d="M21.9 4.4c.3-1.2-.9-2.2-2-1.7L2.4 10.4c-1.3.5-1.3 2.4.1 2.8l4.3 1.3 1.7 5.4c.3.9 1.4 1.1 2.1.5l2.5-2.2 4.4 3.3c.9.7 2.2.2 2.5-.9l3-15.2zM8.6 13.8l9.4-6.1c.3-.2.6.2.3.4l-7.9 7.4c-.3.3-.5.7-.5 1.1l-.2 2.5-1.4-4.4c-.1-.4 0-.7.3-.9z" />
      </svg>
    </a>
  );
}
