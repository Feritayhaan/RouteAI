// Cihaza göre düzen sınıfları (ana sayfa ve iş akışı ortak kullanır).

/**
 * Yan yana düzende sağ sütun (lg ve üstü): sayfa kayarken yanında durur, uzunsa
 * kendi içinde kayar. lg:p-1 lg:-m-1: kaydırma kutusu gölgeyi ve odak halkasını kesmesin.
 */
export const sidePanel = "lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:overscroll-contain lg:p-1 lg:-m-1"
