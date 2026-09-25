# Gizlilik doğrulaması — kodda gerçekte ne saklanıyor

Gizlilik sayfası (`app/privacy`, metin `lib/i18n/privacy.ts`) bu dosyadaki bulgulara dayanıyor. Kod değişince tekrar kontrol et.

## Nasıl doğrulandı (2026-09-24)

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
| `/api/chat` (`lib/agent/handler.ts`) | Sadece `usage:<ay>` ve `usage:day:<gün>` token sayaçları; log: görev, araç çağrı sayısı, gecikme, token | Aylık anahtar ~62 gün | **Hayır.** Mesajlar OpenAI'a gider, KV'ye ve loga yazılmaz |
| Prompt oturumu `ps:<id>` (`lib/promptBuilder/store.ts`) | Amaç (goal), slot değerleri, serbest iyileştirme talimatı, üretilen promptlar | 24 saat | **Evet, 24 saat** (gizlilik sayfasında yazılı) |
| `/api/outcome` (`lib/signals/store.ts`) | Cevap (evet/kısmen/hayır), etiketler, ürün, görev, rehber sürümü; anahtar: oturum hash'i | ~400 gün | Hayır (serbest metin şemada yok) |
| `/api/feedback`, sohbet biçimi | Oy, ürün, görev, oturum hash'i | ~400 gün | Hayır |
| `/api/feedback`, klasik biçim (`fb:*`) | **Sorgu metni**, araç adı, oy | Süresiz | **Evet** (klasik arayüz; sayfada yazılı) |
| `/api/events` (`lib/analytics/store.ts`) | Gün + olay sayaçları, görev/rehber kodları; `ret:<gün>` kümesinde oturum hash'i | 120 gün / 30 gün | Hayır |
| Rate limit (`lib/rateLimit.ts`) | Anahtarda **IP adresi** (`ratelimit:<uç>:<ip>:minute\|hour`) | Pencere + 10 sn (en fazla ~1 saat) | Hayır |
| Klasik `/api/recommend` niyet önbelleği (`lib/intent/cache.ts`) | Anahtarda **normalize edilmiş sorgu metni** | 24 saat | **Evet** (klasik arayüz; sayfada yazılı) |
| Embedding önbelleği (`lib/vectorService.ts`) | Sorgudan türetilen vektör, anahtar hash | 1 saat, sadece VECTOR_SEARCH_ENABLED=true | Türetilmiş |
| Workflow önbelleği (`lib/workflow/cache.ts`) | Şablon id + kategori + kısıtlar anahtarlı üretilmiş workflow | TTL'li | Hayır |

## Önerilen iyileştirme (P8 kapsamı dışı, karar Ferit'in)

- Klasik geri bildirimde (`fb:*`) sorgu metnine TTL eklemek ya da sorgunun sadece hash'ini saklamak.
- Klasik niyet önbelleği anahtarını sorgu metni yerine hash'le kurmak.
