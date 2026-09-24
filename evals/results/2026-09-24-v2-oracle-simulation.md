# RouteAI Skoru simülasyonu (SENTETİK VERİ)

Üretim: 2026-09-24, `npm run eval:simulate`. Bu tablo gerçek ürün ya da gerçek kullanıcı verisi değildir; lib/catalog/score.ts'in davranışını göstermek için hayali iki ürünle kuruldu.

- A: arenadaki en iyi modeli kullanıyor (B = 1.0), kullanıcıların %20'si "işimi gördü" diyor.
- B: arenada ortada (B = 0.5), kullanıcıların %80'i "işimi gördü" diyor.
- Her iki ürüne de aynı sayıda iş sonucu geliyor (n). Uzman değerlendirmesi yok.

| n (ürün başına iş sonucu) | q(A) | q(B) | benchmark payı | güven (A/B) | 1. sıra |
| --- | --- | --- | --- | --- | --- |
| 0 | 1.000 | 0.500 | %100.0 | low / low | A |
| 3 | 0.846 | 0.538 | %76.9 | low / low | A |
| 5 | 0.733 | 0.600 | %66.7 | low / low | A |
| 10 | 0.600 | 0.650 | %50.0 | medium / medium | B |
| 20 | 0.467 | 0.700 | %33.3 | medium / medium | B |
| 30 | 0.400 | 0.725 | %25.0 | high / high | B |
| 90 | 0.280 | 0.770 | %10.0 | high / high | B |
| 91 | 0.277 | 0.772 | %9.9 | high / high | B |

Okuma: gözlem yokken sıra benchmark'a göre (A önde). Ürün başına 10 iş sonucunda kendi kanıt baskın gelir ve B öne geçer; 90 iş sonucunda benchmark'ın payı tam %10, 91'de %10'un altı.

Not: ROADMAP "90 iş sonucundan sonra benchmark'ın payı %10'un altına düşer" diyor; formülde 90'da pay tam 10/100 = %10, altına 91'de iniyor. Ağırlıklar değiştirilmedi; ifade düzeltilebilir.
