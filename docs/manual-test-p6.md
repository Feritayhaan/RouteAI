# P6 elle test adımları — sohbet arayüzü (en + tr)

Playwright npm paketi projede kurulu değil (paket eklenmedi). Ekran görüntüleri, ortamda hazır bulunan Chromium ikilisiyle DevTools protokolü üzerinden alındı: `docs/screenshots/p6-*-{360,1280}.png`. Ölçüm (2026-09-24): `/` ve `/dev/cards` sayfalarında 360 ve 1280 piksel genişlikte yatay kaydırma yok; 44×44 pikselden küçük dokunma hedefi yok.

## Ön koşul

- `.env.local`: `KV_REST_API_URL`, `KV_REST_API_TOKEN` (yoksa rate limiter bilinçli olarak kapalı kalır ve `/api/chat` 429 döner) ve `OPENAI_API_KEY` (yoksa ajan yerine v1 anahtar kelime yolu çalışır, kart "Hızlı anahtar kelime eşleşmesi" notuyla gelir).
- `npm run dev` → http://localhost:3000

## 1. Dil seçimi

1. Tarayıcı dili Türkçe iken `/chat` aç → başlık, örnek butonlar ve giriş kutusu Türkçe; sayfa kaynağında `<html lang="tr">`.
2. `/chat?lang=en` → her şey İngilizce, `<html lang="en">`, sekme başlığı İngilizce.
3. Sağ üstteki `EN` / `TR` bağlantısı dili değiştirir.

## 2. Tam sohbet (TR)

1. "Fırınım için logo lazım" örneğine tıkla.
2. Ajan logoda yazı olup olmadığını sorabilir. Soru kartı çıkarsa seçeneklerden birine **klavyeyle** (Tab + Enter) bas → seçim kullanıcı mesajı olarak görünür ve cevap akmaya başlar. Kart artık tekrar tıklanamaz.
3. Öneri kartında şunları kontrol et:
   - ana ürün büyük, güven rozeti (üzerine gelince ya da odaklanınca koşul açıklaması)
   - fiyat satırı
   - gerekçe satırları
   - "Sıralamanın dayanağı" çubuğu
   - "Veri: {tarih} · {kaynaklar}" satırı (LMArena / Artificial Analysis linkli)
   - "Aracı aç" (yeni sekmede açılır)
   - en fazla 2 alternatif
   - 👍/👎 butonları
4. Katalogda henüz kanıt yoksa (bugünkü durum: models.json, reviews.json, signals.json boş) kartın yerine "Bu görevde katalogda henüz güvenilir veri yok" notu çıkar. Bu doğru davranış: araç uydurulmaz.
5. Kısıt gevşetildiyse (ör. "tamamen ücretsiz" deyip ücretsiz araç yoksa) sarı uyarı görünür.
6. "Durdur" (kare) butonu akışı keser → "Durduruldu."
7. Sunucuyu durdurup mesaj gönder → hata mesajı + "Tekrar dene".
8. Aynı IP'den dakikada 20'den fazla mesaj gönder → "Çok fazla istek. N sn sonra tekrar dene." ve gönder butonu o süre boyunca kapalı.

## 3. Tam sohbet (EN)

Aynı adımlar `/chat?lang=en` ile. Ajan kullanıcının dilinde cevap vermeli.

## 4. İş sonucu ve karşılaştırma kartları

1. Bir öneride "Aracı aç"a tıkla, sekmeyi 2 dakikadan uzun bir süre arka planda bırak, geri dön → sohbetin sonunda "{ürün} işini gördü mü?" kartı çıkar (Evet / Kısmen / Hayır; Kısmen/Hayır'da isteğe bağlı etiketler).
2. Aynı görevde iki farklı ürünü açıp dönersen iş sonucu yerine "Hangisi daha iyiydi?" kartı çıkar.
3. Soru oturum başına en fazla 1 kez gelir. Sekmeyi kapatıp yeni bir oturumda açınca 7 günden yeni bekleyen tıklama varsa tekrar gelir.
4. Ağ sekmesinde `POST /api/outcome` gövdesi: `sessionId`, `taskId`, `productId`, `answer`, `tags`. Mesaj metni yok.

## 5. Kart önizlemesi (sadece geliştirme)

`/dev/cards?lang=tr` ve `/dev/cards?lang=en`: tüm kart tipleri örnek veriyle (soru, öneri + gevşetme uyarısı, P7 öncesi prompt kartı, veri yok notu, hata, iş sonucu, karşılaştırma). Üretimde 404 döner. Sayılar ve ürün adları hayalidir.

## 6. Erişilebilirlik ve mobil

- 360 px genişlikte yatay kaydırma yok; butonlar en az 44 px.
- Tab ile tüm butonlar gezilebilir, odak halkası görünür.
- Tema butonu (sağ üst) sistem → aydınlık → karanlık; kartlar iki temada da okunur.
- Ekran okuyucu: akan asistan metni `aria-live="polite"`; güven rozetinin açıklaması görünmez metin olarak da var.

## 7. Navigasyon arayüzü (ana sayfa)

2026-09-25'ten beri `/` eski navigasyon arayüzünü açar; sohbet `/chat`'te. `/classic` 308 ile `/`'a yönlenir. Bu belgedeki sohbet adımlarını `/chat` adresinde uygula.
