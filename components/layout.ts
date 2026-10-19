// Cihaza göre düzen sınıfları (ana sayfa ve iş akışı ortak kullanır).

/**
 * Yan yana düzende sağ sütun (lg ve üstü). İç kaydırma çubuğu ve yapışkanlık YOK: sütun içeriği kadar uzar,
 * sayfa tek kaydırmayla gezilir (yapışkan panel ekrandan uzunsa alt kısmı görünmez olurdu).
 * lg:min-w-0: ızgara öğesi uzun içerikle sütunu genişletip yatay taşma yapmasın (eskiden overflow bunu sağlıyordu).
 */
export const sidePanel = "lg:min-w-0"
