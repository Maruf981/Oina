// Сжатие фото Cloudinary при отдаче: WebP/AVIF + авто-качество + ограничение ширины.
// Оригинал в Cloudinary не меняется. Не-Cloudinary ссылки и видео возвращаются как есть.
export function cld(url: string | null | undefined, width = 1000): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return url;
  if (/\/image\/upload\/[^/]*(f_auto|q_auto)/.test(url)) return url;
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
}

// Сжатие видео Cloudinary при отдаче: авто-формат/кодек/качество + ограничение ширины.
export function cldVideo(url: string | null | undefined, width = 720, quality = "auto"): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/video/upload/")) return url;
  if (/\/video\/upload\/[^/]*(f_auto|q_auto)/.test(url)) return url;
  return url.replace("/video/upload/", `/video/upload/f_auto,q_${quality},vc_auto,c_limit,w_${width}/`);
}

export const isVideoUrl = (url: string | null | undefined) => !!url && /\/video\/upload\/|\.(mp4|webm|mov)(\?|$)/i.test(url);

// Первый кадр видео Cloudinary как картинка — постер, пока видео грузится, и превью в админке.
export function cldVideoPoster(url: string, width = 1000): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/video/upload/")) return "";
  return url
    .replace("/video/upload/", `/video/upload/so_0,f_auto,q_auto,c_limit,w_${width}/`)
    .replace(/\.(mp4|webm|mov)(\?|$)/i, ".jpg$2");
}
