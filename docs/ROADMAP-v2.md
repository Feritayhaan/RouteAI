# RouteAI v2 — Yol haritası (lansman: Kasım 2026 sonu)

## Ürün
Sohbet eden ajan: amacı anlar, gerekirse en fazla 2 seçenekli soru sorar, görev taksonomisinden bir görev seçer, katalogdan puanlı ürünleri alır, en iyi araç + 2 alternatifi güven seviyesi, fiyat, veri tarihi ve kaynakla önerir, seçilen araç için prompt rehberinden etkileşimli olarak prompt üretir: konuşmadan bilgileri çıkarır, gerekirse tek kartta en fazla 3 soru sorar, iki varyant (güvenli/yaratıcı) gösterir, kullanıcı butonlar ve serbest metinle iyileştirir. Global, en + tr.
Kapsam dışı (lansman sonrası): hesaplar, ödeme, sponsorlu listeleme, mobil uygulama, Postgres, API-proxy.

## Mimari
- Katalog git'te JSON: data/tasks.json, data/models.json, data/products.json, data/reviews.json, data/briefs.json, data/signals.json, data/prompt-guides/*.md. Zod şeması lib/catalog/schema.ts.
- Modeller her gece GitHub Action ile Artificial Analysis API ve LMArena (Hugging Face) verisinden güncellenir ve PR açılır. Ürünler seçilmiştir; yeni ürünler 'candidate' olarak PR ile gelir.
- /api/chat: OpenAI tool calling. Araçlar: search_catalog, ask_user, build_prompt, get_workflow. Puanı her zaman deterministik kod hesaplar.
- OpenAI erişilemezse ya da aylık bütçe dolarsa v1 anahtar kelime yoluna düşülür.

## RouteAI Skoru (ana sistem)
Sıralama RouteAI'ın kendi kanıtına dayanır; benchmark sadece ön bilgidir. Birim: (ürün, görev) çifti. Görev taksonomisi bu yüzden omurgadır.
q = (kb*B + ke*E + Σ w*y) / (kb + ke + Σ w). kb = 10 (B: LMArena/AA yüzdelik dilimi; yoksa kb = 0). ke = 5 (E: uzman rubriği 0–1; yoksa ke = 0).
Kendi gözlemler: iş sonucu w = 1 (evet 1, kısmen 0.5, hayır 0), karşılaştırma w = 0.5 (kazanan 1, kaybeden 0), öneri oyu w = 0.3. 90 iş sonucundan sonra benchmark'ın payı %10'un altına düşer.
Kanıt kuralı: B yok, uzman değerlendirmesi yok ve kendi gözlem ağırlığı 3'ten azsa ürün önerilmez. Sponsorluk ve affiliate bilgisi sıralamaya asla girmez.
Güven: high = kendi gözlem ağırlığı ≥ 30 VE en yeni gözlem ≤ 30 gün; medium = kendi gözlem ≥ 10 VEYA (benchmark ≤ 30 gün VE uzman değerlendirmesi); low = diğer.

## Fazlar
P0 zemin | P1 altın eval seti | P2 veri modeli + taksonomi | P3 gece model senkronu | P4 RouteAI Skoru motoru | P5 sohbet ajanı API | P6 sohbet arayüzü + i18n | P7 etkileşimli prompt oluşturucu | P8 keşif, geri bildirim, analitik, lansman

## Hedefler
Altın sette doğru görev ≥ %90, ilk 3'te kabul edilebilir araç ≥ %85. Lansman sonrası: iş sonucu yanıt oranı ≥ %20, işini gördü oranı ≥ %65, beğenilme ≥ %70, araca geçiş ≥ %40, prompt kopyalama ≥ %30, netleştirme oranı %15–%35.

## P0 notları
- lib/recommendV1.ts P0'da oluşturuldu; P1 onu yeniden oluşturmaz, kullanır.
- Anahtar kelime eşleşmesi: kelime başından önek eşleşmesi, Türkçe eklere izin verir; "art" tam kelime.
- Admin uçları sadece x-admin-key başlığı; seed POST.

## Baseline (v1)
Koşu: 2026-09-24, `npm run eval -- --recommender=v1`. Sonuç: `evals/results/2026-09-24-v1.json`. Altın set: `evals/golden.jsonl` (40 sorgu, TASLAK; bkz. `evals/REVIEW.md`). Katalog `lib/tools-database.json` (56 aktif araç); KV ve vektör araması eval sürecinde kapalı.

**Eksik ölçüm:** Koşu OPENAI_API_KEY olmadan yapıldı. LLM kademesine giden 25 sorgu (6 kelimeden uzun ya da anahtar kelimesi olmayan sorgular) skipped. Aşağıdaki sayılar sadece kural tabanlı kademede çözülen 15 kısa sorguyu kapsıyor ve iyimser. Anahtarla tekrar koşulup bu tablo güncellenmeli.

| Metrik | v1 (anahtarsız) | Hedef (v2) |
| --- | --- | --- |
| top1Hit | 12/15 = %80.0 | — |
| top3Hit | 13/15 = %86.7 | ≥ %85 |
| taskMatch | n/a (v1 görev döndürmüyor) | ≥ %90 |
| clarifyRate | 0/15 = %0 (netleştirme gereken 5 satırın hiçbirinde sormadı) | %15–%35 |
| skipped | 25/40 | 0 |

Iskalar: tr-05 "python kodumda hata var" (ana öneri n8n; ilk 3'te Copilot var), tr-06 "ürün fotoğrafı arka plan kaldır" (görsel üreticilere düştü), tr-19 "YouTube kanalım için ses lazım" (workflow'a düştü; ilk adımda NotebookLM).

## P4 notları
- v2-oracle (görev golden'dan doğru kabul, sadece RouteAI Skoru sıralaması), 2026-09-24: top3Hit 0/39. Neden veri: `data/models.json` boş (senkron henüz koşmadı, ürünlere model bağlı değil), uzman değerlendirmesi ve sinyal yok; RouteAI Skoru kanıtsız ürünü önermiyor. Ayrıntı: `evals/results/v2-oracle-misses.md`.
- Simülasyon (sentetik, `npm run eval:simulate`): gözlem yokken sıra benchmark'a göre; ürün başına 10 iş sonucunda kendi kanıtı iyi olan ürün öne geçiyor. `evals/results/2026-09-24-v2-oracle-simulation.md`.
- Formül notu: 90 iş sonucunda benchmark payı tam 10/100 = %10; "%10'un altı" 91'de başlıyor. Ağırlıklar değiştirilmedi; ifade ya da K_BENCHMARK Ferit'in kararı.
- `searchCatalog` kısıt gevşetmesi sırası: maxMonthlyUsd → access → pricing → commercialUse; gevşetilenler `relaxedConstraint` dizisinde döner.

