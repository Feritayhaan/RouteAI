# Kazananlar Matrisi

Bu dosya araç sıralamasının **tek doğruluk kaynağıdır**. `scripts/rescale-strength.mjs`
burayı parse edip `lib/tools-database.json`'daki `strength` alanını üretir.
Burada olmayan araç 60 alır — "iyi ama kazanan değil". Skoru buradan başka hiçbir şey
belirlemez.

## Nasıl doldurulur

Aşağıdaki tabloya satır ekleyin. Her satır: **bir iş türünde bir aracın bir sırası**.

| Sütun | Kural |
|---|---|
| `İş Türü` | Serbest metin. Aynı iş türü 3 satırda tekrarlanır (1., 2., 3. sıra için). |
| `Sıra` | Sadece `1`, `2` veya `3`. Başka değer hata verir. |
| `Araç` | **`lib/tools-database.json`'daki `name` ile birebir aynı olmalı** (veya `id`). Tanınmayan isim hata verir, script durur. |
| `Gerekçe` | Serbest metin. Skoru etkilemez; dry-run tablosunda gerekçe olarak gösterilir. |
| `Ücret` | `ücretsiz` veya `ücretli`. Skoru etkilemez; JSON'daki `pricing` ile çelişirse script uyarır. |

Kurallar:

- Aynı iş türü + aynı sıra iki kez yazılamaz (script hata verir).
- Bir araç birden çok iş türünde geçebilir — **en yüksek sırası** taban skoru belirler,
  her ek geçiş `+2` ekler, tavan `94`.
- Tabloyu bölmeyin; tek tablo olarak kalsın. Tablo dışındaki satırlar yok sayılır.

## Matris

<!-- Aşağıdaki 3 satır ÖRNEKTİR. Kendi satırlarınızı yazıp bunları SİLİN.
     Script, "ÖRNEK - SİLİNECEK" ibaresi dosyada durduğu sürece ÇALIŞMAYI REDDEDER. -->

| İş Türü | Sıra | Araç | Gerekçe | Ücret |
|---|:---:|---|---|---|
| ÖRNEK - SİLİNECEK: Logo tasarımı | 1 | Midjourney v7 | Sanatsal kalite ve kompozisyon en iyisi | ücretli |
| ÖRNEK - SİLİNECEK: Logo tasarımı | 2 | Adobe Firefly Image 4 | Ticari kullanım güvenli, marka entegrasyonu | ücretli |
| ÖRNEK - SİLİNECEK: Sunum hazırlama | 1 | Gamma AI | Metinden tam slayt akışı, en az elle düzeltme | ücretsiz |
