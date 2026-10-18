// Görev -> LMArena alt kategori EŞLEME ÖNERİLERİ (denetim raporu için) — YALNIZCA HENÜZ UYGULANMAMIŞ OLANLAR.
//
// `npm run audit:catalog` bu önerilerle "sıra nasıl değişirdi" diye hesaplar ve yazar; öneriler
// data/tasks.json'a ve sıralamaya GİRMEZ. Onaylanan eşlemeler tasks.json'a taşınır ve buradan çıkarılır.
//
// UYGULANDI (2026-10-18, sıralamaya girdi; sıra bu eşlemelerle DEĞİŞMİYOR, denetimde ρ=1 çıkmıştı):
//   text.marketing-copy -> text/creative_writing        text.write-longform -> text/creative_writing + text/longer_query
//   text.email          -> text/instruction_following   text.rewrite-edit   -> text/instruction_following
//   text.summarize      -> text/longer_query + text/instruction_following
//   text.translate      -> text/non_english             chat.general-assistant -> text/multi_turn
//   image.logo          -> text_to_image/text_rendering + commercial_design
//   image.product-photo -> text_to_image/photorealistic + commercial_design
//   design.social-graphic -> text_to_image/commercial_design + text_to_image/text_rendering
//   Alt kategoride veri yoksa skor hesabı genel arenaya düşer (lib/catalog/score.ts); sıra o durumda eskisiyle aynıdır.
//
// AÇIK KALANLAR:
//  - code.debug: webdev yerine text/coding SIRAYI TERSİNE ÇEVİRİYOR (ρ=-1). Hangi ölçünün hata ayıklamayı
//    temsil ettiği bir karar: webdev / text/coding / ikisi birden / Artificial Analysis / nesnel test. Karar verilene kadar dokunulmadı.
//  - code.website-builder, code.app-builder: ürünlerin arenada bağlı modeli yok -> etkisiz (karşılaştırılabilir ürün 0).
//
// Kategori adları kaynaktaki (lmarena-ai/leaderboard-dataset) `category` değerleridir.
// Veride olmayan kategori rapora "kategori yok" diye düşer; uydurulmaz.
//
// DOĞRULAMA DURUMU (2026-10-16 gerçek senkron raporu, data/sync-report.md):
//  - webdev:        image_to_webdev, overall, webdev, webdev-html, webdev-react        -> DOĞRULANDI
//  - text_to_image: 3d_modeling, art, cartoon, chinese, commercial_design, english,
//                   overall, photorealistic, portraits, russian, text_rendering        -> DOĞRULANDI
//  - image_edit:    multi_image_edit, overall                                          -> DOĞRULANDI
//  - text:          creative_writing, longer_query, instruction_following, non_english,
//                   multi_turn, coding   -> DOĞRULANDI (2026-10-16 denetim tablosu bu kategorilerin
//                   hepsinde veri üretti; "kategori yok" satırı çıkmadı)
//  Test (lib/__tests__/audit.test.ts) doğrulanmış arenalardaki kategori adlarını bu listeyle karşılaştırır.
//
//   taskId       : etkilenen görev
//   replace      : görevdeki hangi LMArena config'inin yerine geçer (görevin mevcut benchmark girdisi)
//   use          : kullanılacak { config, category } listesi (birden çoksa yüzdelikler ortalanır)
//   why          : eşlemenin gerekçesi (insan okuyacak)

export const CATEGORY_PROPOSALS = [
  { taskId: 'code.debug', replace: 'webdev', use: [{ config: 'text', category: 'coding' }], why: 'Hata ayıklama: webdev (uygulama inşası) yerine genel kodlama istemleri.' },

  // NOT: aşağıdaki iki webdev önerisi şu an ETKİSİZ: bu görevlerde hiçbir ürünün (uygulama/site
  // oluşturucular) arenada bağlı modeli yok, karşılaştırılabilir ürün 0. Raporda "etkisiz" görünür.
  { taskId: 'code.website-builder', replace: 'webdev', use: [{ config: 'webdev', category: 'webdev-html' }], why: 'Web sitesi yapma: HTML tabanlı web geliştirme.' },
  { taskId: 'code.app-builder', replace: 'webdev', use: [{ config: 'webdev', category: 'webdev-react' }], why: 'Uygulama oluşturucu: React tabanlı uygulama geliştirme.' },
];
