# RouteAI — Claude Code Kuralları (Faz 2 / v2)

## Proje
RouteAI: kullanıcının amacını sohbetle anlayıp en uygun AI aracını, güven seviyesiyle ve o araç için hazır promptla veren ajan. Global, çok dilli (en + tr). Next.js 16, Vercel, Upstash KV, OpenAI.
Yol haritası: docs/ROADMAP-v2.md. Verilen prompt hangi fazdaysa sadece onun kapsamına dokun.

## Mutlak kurallar
- ASLA puan, benchmark değeri, fiyat ya da tarih uydurma. Her sayı data/ altında kaynağı ve tarihiyle durur. Kaynağı olmayan sayı = hata.
- ASLA git push, deploy ya da vercel komutu çalıştırma. Commit'e kadar getir, dur.
- ASLA canlı Upstash KV verisini silen/sıfırlayan komut çalıştırma. Seed/migrate scriptleri yazılır, Ferit çalıştırır.
- ASLA API anahtarı ya da token commit etme; hepsi ortam değişkeninden.
- Yeni npm paketi sadece prompt açıkça izin verdiyse. Eklersen nedenini özete yaz.
- İstenmeyen dosyayı refactor etme, yeniden adlandırma.
- Türkçe metinde ç, ğ, ı, ö, ş, ü karakterlerini koru.
- Artificial Analysis ve LMArena verisi gösterilirken kaynak adı görünür olmalı (lisans şartı).
- Katalogda olmayan bir ürünü ya da modeli asla önerme; ajan sadece search_catalog sonucundan konuşur.
- Sıralama RouteAI Skoru'dur: kendi kanıtımız (iş sonucu, karşılaştırma, oy, uzman değerlendirmesi) esastır, benchmark sadece ön bilgidir. Sponsorluk/affiliate sıralamaya asla girmez.

## Her değişiklikten sonra
- npm run build, npm test, npm run lint ve (varsa) npm run validate:catalog ile npm run eval çalıştır; çıktı özetini göster.
- Zod şemaları veriyle senkron kalır.
- Belirsizlikte varsayım yapma, sor.
- Özet kısa olsun: hangi dosya, ne değişti, nasıl doğrulandı.
