// Сжатие фото Cloudinary при отдаче: WebP/AVIF + авто-качество + ограничение ширины.
// Оригинал в Cloudinary не меняется. Не-Cloudinary ссылки и видео возвращаются как есть.
export function cld(url: string | null | undefined, width = 1000): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return url;
  if (/\/image\/upload\/[^/]*(f_auto|q_auto)/.test(url)) return url;
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
}
