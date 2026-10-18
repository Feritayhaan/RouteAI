# Gizlilik doğrulaması — kodda gerçekte ne saklanıyor

Gizlilik sayfası (`app/privacy`, metin `lib/i18n/privacy.ts`) bu dosyadaki bulgulara dayanıyor. Kod değişince tekrar kontrol et.

## Nasıl doğrulandı (2026-09-24; 2026-09-25'te sohbet kaldırıldı, ana sayfa navigasyon + prompt oluşturucu, tablo güncellendi; 2026-09-28'de ana sayfa v3 + "İşini gördü mü?" (P15), tablo güncellendi)

Arama metninin loglanmadığı: `app/api/recommend/route.ts`, `lib/intent/*`, `lib/workflow/*` logları sadece uzunluk, kategori ve şablon id basıyor (2026-09-25'te `grep console.` ile kontrol edildi).

1. KV'ye yazan her çağrı tarandı:
   ```
   grep -rn "kv\.\(set\|lpush\|sadd\|zadd\|incrby\|hincrby\)\|store\.set" lib app
   ```
   Pipeline içindeki yazımlar da (`lib/rateLimit.ts`, `lib/analytics/store.ts`) elle okundu.
2. Sunucudaki tüm `console.log/error/warn` çağrıları tarandı: `app/api`, `lib/agent`, `lib/promptBuilder`, `lib/signals`, `lib/analytics`.
3. Testler bunları kilitliyor: `lib/__tests__/agent.test.ts` (sohbet logunda kullanıcı metni yok), `outcomeApi.test.ts` ve `p8.test.ts` (anahtarlarda ham oturum kimliği yok, serbest metin alanı reddediliyor).

## Bulgular

| Yer | Ne saklanıyor | Süre | Kullanıcı metni? |
| --- | --- | --- | --- |
| Prompt oturumu `ps:<id>` (`lib/promptBuilder/store.ts`; ana sayfadaki prompt oluşturucu, `/api/prompt/start`) | Amaç (goal), slot değerleri, serbest iyileştirme talimatı, üretilen promptlar | 24 saat | **Evet, 24 saat** (gizlilik sayfasında yazılı) |
| `/api/outcome` (`lib/signals/store.ts`; ana sayfadaki "İşini gördü mü?" kartı, `components/OutcomePrompt.tsx`) | Cevap (evet/kısmen/hayır), etiketler, ürün, görev, rehber sürümü; anahtar: oturum hash'i | ~400 gün | Hayır (serbest metin şemada yok) |
| `/api/feedback`, v2 biçimi (ana sayfa, v3 kartındaki beğendim/beğenmedim) | Oy, ürün, görev, oturum hash'i | ~400 gün | Hayır |
| `/api/feedback`, navigasyon biçimi (`fb:*`) | **Sorgu metni**, araç adı, oy | Süresiz | **Evet** — yalnızca eski kayıtlar ve RECOMMENDER=v1 açıksa (sayfada yazılı) |
| `/api/events` (`lib/analytics/store.ts`) | Gün + olay sayaçları, görev/rehber kodları; `ret:<gün>` kümesinde oturum hash'i | 120 gün / 30 gün | Hayır |
| Rate limit (`lib/rateLimit.ts`) | Anahtarda **IP adresi** (`ratelimit:<uç>:<ip>:minute\|hour`) | Pencere + 10 sn (en fazla ~1 saat) | Hayır |
| Navigasyon `/api/recommend` görev önbelleği, v3 (`lib/intent/taskCache.ts`, `task:v1:`) | Anahtarda **normalize edilmiş sorgu metni**; değer görev sınıflandırması | 24 saat | **Evet** (ana sayfa; sayfada yazılı) |
| Navigasyon niyet önbelleği, v1 (`lib/intent/cache.ts`) | Anahtarda **normalize edilmiş sorgu metni** | 24 saat | Evet — yalnızca RECOMMENDER=v1 açıksa |
| Tarayıcı `localStorage` `routeai:pending-outcomes` (`components/toolOpen.ts`, `lib/chat/outcomes.ts`) | Açılan araç: ürün id + adı, görev id, tıklama zamanı | 7 gün (eskisi okunurken düşer), sadece tarayıcıda | Hayır |
| Tarayıcı `sessionStorage` `routeai:outcome-asked` | Bu ziyarette soru soruldu bayrağı | Sekme kapanana kadar | Hayır |
| Tarayıcı `localStorage` `routeai-ratings` (eski sürüm) | Yıldız puanları **arama metniyle** | Artık yazılmıyor; `OutcomePrompt` ana sayfa açılınca siler | Eski kayıtlar, sunucuya gitmez |
| Tarayıcı `localStorage` (`WelcomeModal.tsx`, tema, oturum kimliği) | Hoş geldin bayrağı, tema, anonim oturum kimliği | Kullanıcı silene kadar | Hayır |
| Embedding önbelleği (`lib/vectorService.ts`) | Sorgudan türetilen vektör, anahtar hash | 1 saat, sadece VECTOR_SEARCH_ENABLED=true | Türetilmiş |
| Workflow önbelleği (`lib/workflow/cache.ts`) | Şablon id + kategori + kısıtlar anahtarlı üretilmiş workflow | TTL'li | Hayır |

## Önerilen iyileştirme (P8 kapsamı dışı, karar Ferit'in)

- Navigasyon geri bildiriminde (`fb:*`) sorgu metnine TTL eklemek ya da sorgunun sadece hash'ini saklamak.
- Navigasyon niyet önbelleği anahtarını sorgu metni yerine hash'le kurmak.
