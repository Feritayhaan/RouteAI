# Kategori borcu

Mevcut kategori seti yedi değerden oluşuyor:
`gorsel · metin · ses · arastirma · video · veri · kod`

Karantina triyajı sırasında **TUT** kararı verilen üç kayıt bu yediye hiç sığmadı.
Yeni kategori eklemedik — kategori seti `lib/keywords.ts`, intent parser'ın LLM
şeması ve `CategoryBadge` rozetlerini zincirleme etkiliyor, ayrı bir karar.
Üçü de **en yakın** kategoriye atandı; kayıp aşağıda.

| Araç | Gerçekte ne | Atandığı kategori | Ne kaybediyoruz |
|---|---|---|---|
| OpenAI Atlas (AI Browser) | AI yerlisi tarayıcı | `arastirma` | Tarayıcı, "araştırma aracı" değil; görev otomasyonu ve gezinme yönü kayboluyor. "tarayıcı" diye arayan kullanıcı bulamaz. |
| Fathom (Meeting Assistant) | Toplantı notu/özet asistanı | `metin` | Metin üretiyor ama tetikleyicisi toplantı; "toplantı özeti" sorgusu `metin` kategorisindeki 16 aracın arasında kayboluyor. |
| ClickUp Brain (Project AI) | Proje yönetimi AI'ı | `metin` | Görev/iş akışı yönetimi bir metin işi değil; kategori sinyali tamamen yanlış. |

## Neden şimdi çözmüyoruz

Yeni bir kategori (`tarayici`, `verimlilik`, `proje` vb.) eklemek en az dört yeri
birden değiştirmeyi gerektiriyor:

1. `lib/keywords.ts` — `Category` tipi + anahtar kelime listesi + `CATEGORY_PRIORITY`
2. `lib/intent/parser.ts` — LLM şemasındaki `primaryCategory` enum'u ve prompt talimatları
3. `app/api/recommend/route.ts` — `categoryOutputMap` (kategori → beklenen `outputTypes`)
4. `components/CategoryBadge.tsx` — rozet etiketi ve emoji

Bunların hepsi tek turda yapılabilir ama ölçüm gerektirir: yeni kategori eklemek
intent sınıflandırmasının dağılımını değiştirir, 10 benchmark sorgusunun kategorileri
kayabilir. Ayrı bir tur olarak planlanmalı.

## Yan bulgu: `veri` kategorisi neredeyse boşaldı

Triyaj ve kategori düzeltmelerinden sonra aktif kayıtların dağılımı:

| Kategori | Aktif araç |
|---|---|
| metin | 16 |
| gorsel | 14 |
| video | 9 |
| kod | 7 |
| ses | 4 |
| arastirma | 4 |
| **veri** | **2** |

`veri` kategorisinde sadece Tableau ve Microsoft Power BI kaldı. Bunun sebebi
kategorinin gerçekten dar olması değil, toplu ithalde `veri`nin çöp kutusu gibi
kullanılmış olması: tarayıcı, toplantı asistanı, özgeçmiş aracı, reklam kreatifi
aracı — hepsi `veri` etiketiyle girmişti. Şimdi doğru yerlerine dağıldılar.

Sonuç: "Excel veri analizi" gibi bir sorgu artık iki araç arasından seçim yapıyor.
Katalog bu kategoride gerçekten zayıf; kayıt eklemek gerekiyor.
