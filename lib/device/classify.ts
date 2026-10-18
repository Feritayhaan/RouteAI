// Cihaz sınıfı — React ya da Next yüklemez (proxy.ts'te de kullanılır).
// Hibrit: sunucu ilk tahmini User-Agent + Sec-CH-UA-Mobile'dan yapar (ilk ekran
// doğru gelir); tarayıcı genişlik + işaretçi türüyle düzeltir (DeviceProvider).

export const DEVICES = ['mobile', 'tablet', 'desktop'] as const;
export type DeviceClass = (typeof DEVICES)[number];
/** proxy.ts'in isteğe eklediği başlık; layout <html data-device> için okur. */
export const DEVICE_HEADER = 'x-routeai-device';
/** Tailwind `md`: bunun altı mobil. */
export const TABLET_MIN_WIDTH = 768;
/** Tailwind `lg`: bundan itibaren yan yana düzen (yatay tablet ve masaüstü). */
export const SPLIT_MIN_WIDTH = 1024;

export function isDevice(value: unknown): value is DeviceClass {
  return DEVICES.includes(value as DeviceClass);
}

// iPad UA'sı da "Mobile/15E148" taşır: tablet önce bakılır.
const TABLET_UA = /iPad|Tablet|Silk|Kindle|PlayBook/i;
const PHONE_UA = /iPhone|iPod|Android.*Mobile|Mobi|Windows Phone|BlackBerry|Opera Mini/i;

/** Sunucu tahmini. Masaüstü UA'lı iPadOS burada desktop çıkar; tarayıcı düzeltir. */
export function classifyRequest({ userAgent, chUaMobile }: { userAgent?: string | null; chUaMobile?: string | null }): DeviceClass {
  const ua = userAgent ?? '';
  if (TABLET_UA.test(ua)) return 'tablet';
  if (PHONE_UA.test(ua) || chUaMobile?.trim() === '?1') return 'mobile';
  // "Mobile" geçmeyen Android: tablet.
  if (/Android/i.test(ua)) return 'tablet';
  return 'desktop';
}

/** Tarayıcı ölçümü: genişlik önce, geniş ekranda fare yoksa (dokunmatik) tablet. */
export function classifyViewport({ width, coarsePointer, hover }: { width: number; coarsePointer: boolean; hover: boolean }): DeviceClass {
  if (width < TABLET_MIN_WIDTH) return 'mobile';
  if (width < SPLIT_MIN_WIDTH) return 'tablet';
  return coarsePointer && !hover ? 'tablet' : 'desktop';
}

export function isSplit(width: number): boolean {
  return width >= SPLIT_MIN_WIDTH;
}

/** Sunucu genişliği bilmez: yan yana düzeni sadece masaüstü tahmininde varsayar. */
export function serverSplit(device: DeviceClass): boolean {
  return device === 'desktop';
}
