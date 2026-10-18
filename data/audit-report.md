# Katalog denetim raporu

Üretim tarihi: 2026-10-16. Salt okunur: sıralamayı ve veri dosyalarını değiştirmez.

## 1. Özet

- Aktif ürün-görev çifti: 138. Benchmark'ı olan: 67 (%49). Uzman değerlendirmesi olan: 0. Kullanıcı sinyali olan: 0.
- Görev: 40. En az bir ürünü benchmark'lı: 20. Karşılaştırılabilir (en az 2 benchmark'lı ürün): 17.
- Benchmark eşlemesi olmayan görev: 14. Eşlemesi var ama hiçbir ürünün benchmark'ı hesaplanamayan: 6.
- Bayat benchmark (30 günden eski) olan çift: 0; en eski veri: 2026-10-12.
- Şu an sıralamayı belirleyen tek kanıt benchmark'tır (uzman değerlendirmesi ve kullanıcı sinyali yoksa); benchmark'ı olmayan çiftler "doğrulanmadı" kalır.

### Arenalar ve veri durumu

| Kaynak | Arena | Veri olan model | Kullanan görev |
| --- | --- | ---: | ---: |
| artificialanalysis | image-editing | 0 — VERİ YOK | 2 |
| artificialanalysis | image-to-video | 0 — VERİ YOK | 1 |
| artificialanalysis | llm_coding | 0 — VERİ YOK | 3 |
| artificialanalysis | llm_intelligence | 0 — VERİ YOK | 7 |
| artificialanalysis | text-to-image | 0 — VERİ YOK | 4 |
| artificialanalysis | text-to-speech | 0 — VERİ YOK | 2 |
| artificialanalysis | text-to-video | 0 — VERİ YOK | 1 |
| lmarena | document | 44 | 1 |
| lmarena | image_edit | 59 | 2 |
| lmarena | image_to_video | 48 | 1 |
| lmarena | search | 42 | 2 |
| lmarena | text | 415 | 7 |
| lmarena | text_to_image | 82 | 4 |
| lmarena | text_to_video | 48 | 1 |
| lmarena | video_edit | 10 | 1 |
| lmarena | webdev | 141 | 5 |

Eşlemesi var ama hiçbir ürünün benchmark'ı hesaplanamayan görevler: Seslendirme (metinden ses), Ses klonlama, Uygulama oluşturucu, Kod asistanı (editör), Web sitesi yapma, Arka plan kaldırma.

## 2. Aynı benchmark'ı paylaşan görevler

Bu görevler aynı skorla sıralanır; benchmark bu işleri birbirinden AYIRT EDEMEZ.

- 7 görev (artificialanalysis:llm_intelligence + lmarena:text): Genel asistan, E-posta yazımı, Pazarlama metni, Düzeltme ve yeniden yazma, Özetleme, Çeviri, Uzun metin yazımı
- 4 görev (artificialanalysis:text-to-image + lmarena:text_to_image): Sosyal medya görseli, Görsel üretimi, Logo tasarımı, Ürün fotoğrafı
- 3 görev (artificialanalysis:llm_coding + lmarena:webdev): Kod ajanı (terminal), Kod asistanı (editör), Hata ayıklama
- 2 görev (artificialanalysis:text-to-speech): Seslendirme (metinden ses), Ses klonlama
- 2 görev (lmarena:webdev): Uygulama oluşturucu, Web sitesi yapma
- 2 görev (artificialanalysis:image-editing + lmarena:image_edit): Arka plan kaldırma, Görsel düzenleme
- 2 görev (lmarena:search): Akademik araştırma, Web araştırması

## 3. Benchmark eşlemesi olmayan görevler

| Görev | Aktif ürün | Editör seçimi |
| --- | ---: | --- |
| 3D üretimi | 1 | World Labs Marble |
| Ses temizleme | 1 | ElevenLabs |
| Toplantı notu | 1 | Fathom (Meeting Assistant) |
| Transkript (döküm) | 1 | ElevenLabs |
| İş akışı otomasyonu | 1 | n8n AI Workflow Builder |
| Dashboard ve BI | 2 | Microsoft Power BI |
| Tablo analizi | 4 | ChatGPT |
| Belge ve şablon | 6 | ChatGPT |
| Görsel büyütme | 1 | Leonardo AI |
| Müzik üretimi | 2 | Suno AI |
| Sunum hazırlama | 4 | Gamma AI |
| Avatar sunuculu video | 1 | Synthesia |
| Uzun videodan klip | 1 | OpusClip (Video Repurposing) |
| Altyazı | 1 | OpusClip (Video Repurposing) |

## 4. Görev görev kanıt durumu

| Görev | Aktif ürün | Benchmark'lı | Benchmark'ı olmayanlar (neden) |
| --- | ---: | ---: | --- |
| 3D üretimi | 1 | 0 | World Labs Marble (görevin benchmark eşlemesi yok) |
| Ses temizleme | 1 | 0 | ElevenLabs (görevin benchmark eşlemesi yok) |
| Toplantı notu | 1 | 0 | Fathom (Meeting Assistant) (görevin benchmark eşlemesi yok) |
| Transkript (döküm) | 1 | 0 | ElevenLabs (görevin benchmark eşlemesi yok) |
| Seslendirme (metinden ses) | 2 | 0 | ElevenLabs (arenada veri yok); Murf.ai (arenada veri yok) |
| Ses klonlama | 1 | 0 | ElevenLabs (arenada veri yok) |
| İş akışı otomasyonu | 1 | 0 | n8n AI Workflow Builder (görevin benchmark eşlemesi yok) |
| Genel asistan | 6 | 5 | Microsoft Copilot Pro (ürüne model bağlı değil) |
| Kod ajanı (terminal) | 1 | 1 | — |
| Uygulama oluşturucu | 2 | 0 | Base44 (No-Code App Platform) (ürüne model bağlı değil); Replit Agent (ürüne model bağlı değil) |
| Kod asistanı (editör) | 3 | 0 | Cursor (ürüne model bağlı değil); GitHub Copilot (ürüne model bağlı değil); Windsurf (Codeium) (ürüne model bağlı değil) |
| Hata ayıklama | 7 | 4 | Cursor (ürüne model bağlı değil); GitHub Copilot (ürüne model bağlı değil); Windsurf (Codeium) (ürüne model bağlı değil) |
| Web sitesi yapma | 4 | 0 | Base44 (No-Code App Platform) (ürüne model bağlı değil); Cursor (ürüne model bağlı değil); Gamma AI (ürüne model bağlı değil); Replit Agent (ürüne model bağlı değil) |
| Dashboard ve BI | 2 | 0 | Microsoft Power BI (görevin benchmark eşlemesi yok); Tableau (görevin benchmark eşlemesi yok) |
| Tablo analizi | 4 | 0 | ChatGPT (görevin benchmark eşlemesi yok); Claude (görevin benchmark eşlemesi yok); Gemini (görevin benchmark eşlemesi yok); Microsoft Copilot Pro (görevin benchmark eşlemesi yok) |
| Sosyal medya görseli | 6 | 3 | Adcreative.ai (ürüne model bağlı değil); Canva AI (Magic Studio) (ürüne model bağlı değil); Simplified (Content & Design) (ürüne model bağlı değil) |
| Belge ve şablon | 6 | 0 | Canva AI (Magic Studio) (görevin benchmark eşlemesi yok); ChatGPT (görevin benchmark eşlemesi yok); Claude (görevin benchmark eşlemesi yok); Gamma AI (görevin benchmark eşlemesi yok); Microsoft Copilot Pro (görevin benchmark eşlemesi yok); Teal (Resume Builder AI) (görevin benchmark eşlemesi yok) |
| Arka plan kaldırma | 2 | 0 | Adobe Firefly (bağlı model bu arenalarda yok); Canva AI (Magic Studio) (ürüne model bağlı değil) |
| Görsel düzenleme | 3 | 2 | Adobe Firefly (bağlı model bu arenalarda yok) |
| Görsel üretimi | 9 | 7 | Adobe Firefly (bağlı model bu arenalarda yok); Midjourney (bağlı model bu arenalarda yok) |
| Logo tasarımı | 5 | 3 | Canva AI (Magic Studio) (ürüne model bağlı değil); Midjourney (bağlı model bu arenalarda yok) |
| Ürün fotoğrafı | 4 | 3 | Adobe Firefly (bağlı model bu arenalarda yok) |
| Görsel büyütme | 1 | 0 | Leonardo AI (görevin benchmark eşlemesi yok) |
| Müzik üretimi | 2 | 0 | Suno AI (görevin benchmark eşlemesi yok); Udio (görevin benchmark eşlemesi yok) |
| Akademik araştırma | 2 | 1 | Elicit AI (ürüne model bağlı değil) |
| Belgeyle soru-cevap | 4 | 3 | NotebookLM (ürüne model bağlı değil) |
| Web araştırması | 5 | 3 | Gemini (bağlı model bu arenalarda yok); Le Chat (Mistral) (bağlı model bu arenalarda yok) |
| Sunum hazırlama | 4 | 0 | Beautiful.ai (görevin benchmark eşlemesi yok); Canva AI (Magic Studio) (görevin benchmark eşlemesi yok); Gamma AI (görevin benchmark eşlemesi yok); Microsoft Copilot Pro (görevin benchmark eşlemesi yok) |
| E-posta yazımı | 4 | 3 | Microsoft Copilot Pro (ürüne model bağlı değil) |
| Pazarlama metni | 8 | 2 | Adcreative.ai (ürüne model bağlı değil); Anyword (Copy AI) (ürüne model bağlı değil); Copy.ai (ürüne model bağlı değil); Jasper AI (ürüne model bağlı değil); Simplified (Content & Design) (ürüne model bağlı değil); Writesonic (SEO Content) (ürüne model bağlı değil) |
| Düzeltme ve yeniden yazma | 3 | 3 | — |
| Özetleme | 4 | 3 | NotebookLM (ürüne model bağlı değil) |
| Çeviri | 4 | 4 | — |
| Uzun metin yazımı | 6 | 4 | Jasper AI (ürüne model bağlı değil); Writesonic (SEO Content) (ürüne model bağlı değil) |
| Avatar sunuculu video | 1 | 0 | Synthesia (görevin benchmark eşlemesi yok) |
| Kısa sosyal medya videosu | 4 | 1 | Canva AI (Magic Studio) (ürüne model bağlı değil); OpusClip (Video Repurposing) (ürüne model bağlı değil); Pika Labs (bağlı model bu arenalarda yok) |
| Görselden video | 6 | 6 | — |
| Uzun videodan klip | 1 | 0 | OpusClip (Video Repurposing) (görevin benchmark eşlemesi yok) |
| Altyazı | 1 | 0 | OpusClip (Video Repurposing) (görevin benchmark eşlemesi yok) |
| Metinden video | 6 | 6 | — |

## 5. LMArena alt kategorileriyle sıra nasıl değişirdi? (yalnızca hesap; uygulanmadı)

Veri tarihi: 2026-10-16 (0 gün önce). Eşlemeler scripts/audit/proposals.mjs'teki ÖNERİLERDİR; tasks.json'a girmez.

| Görev | Eşleme | Karşılaştırılabilir ürün | Sıra korelasyonu | 1. sıra | Yerini değiştirenler |
| --- | --- | ---: | ---: | --- | --- |
| Pazarlama metni | text/creative_writing | 2 | 1 | değişmedi (Claude) | yok |
| Uzun metin yazımı | text/creative_writing + text/longer_query | 4 | 1 * | değişmedi (Gemini) | yok |
| E-posta yazımı | text/instruction_following | 3 | 1 * | değişmedi (Gemini) | yok |
| Düzeltme ve yeniden yazma | text/instruction_following | 3 | 1 * | değişmedi (Gemini) | yok |
| Özetleme | text/longer_query + text/instruction_following | 3 | 1 * | değişmedi (Gemini) | yok |
| Çeviri | text/non_english | 4 | 1 * | değişmedi (Gemini) | yok |
| Genel asistan | text/multi_turn | 5 | 1 * | değişmedi (Gemini) | yok |
| Hata ayıklama | text/coding | 4 | -1 * | ChatGPT → Gemini | ChatGPT 1→4; Gemini 4→1 |
| Logo tasarımı | text_to_image/text_rendering + text_to_image/commercial_design | 3 | 1 | değişmedi (ChatGPT (görsel)) | yok |
| Ürün fotoğrafı | text_to_image/photorealistic + text_to_image/commercial_design | 3 | 1 * | değişmedi (ChatGPT (görsel)) | yok |
| Sosyal medya görseli | text_to_image/commercial_design + text_to_image/text_rendering | 3 | 1 | değişmedi (ChatGPT (görsel)) | yok |
| Web sitesi yapma | webdev/webdev-html | 0 | — | değişmedi (—) | yok |
| Uygulama oluşturucu | webdev/webdev-react | 0 | — | değişmedi (—) | yok |

Sıra korelasyonu: 1 = sıra aynı, 0 = ilişkisiz, −1 = ters. Yalnızca iki durumda da benchmark'ı olan ürünler karşılaştırılır.
* Bu görevde en az bir ürünün temsil modeli değişti (yeni model alt kategoride yoksa ürün eski bir modelle yarışır); fark kategoriden değil model değişiminden gelebilir. 5b'ye bak.

### 5b. Ayrıntı: sırası değişen görevler ve etkisiz kalan eşlemeler

**Hata ayıklama** (text/coding): önce → sonra

| Ürün | Sıra | Önce | Sonra |
| --- | --- | --- | --- |
| Gemini | 4 → 1 | webdev: gemini-4-argon-high, puan 1678 [1662.6–1693.3], sıra 9/141, yüzdelik 0.943 | text/coding: gemini-4-argon-high, puan 1548.2, sıra 1/410, yüzdelik 1 |
| Claude | 2 → 2 | webdev: claude-sonnet-5.5-xhigh, puan 1773.7 [1759.8–1787.5], sıra 3/141, yüzdelik 0.986 | text/coding: claude-opus-5.5-high, puan 1542.8, sıra 2/410, yüzdelik 0.998 |
| Claude Code (Anthropic) | 2 → 2 | webdev: claude-sonnet-5.5-xhigh, puan 1773.7 [1759.8–1787.5], sıra 3/141, yüzdelik 0.986 | text/coding: claude-opus-5.5-high, puan 1542.8, sıra 2/410, yüzdelik 0.998 |
| ChatGPT | 1 → 4 | webdev: gpt-6-astra-max, puan 1780.2 [1769.7–1790.8], sıra 2/141, yüzdelik 0.993 | text/coding: gpt-5.6-sol-xhigh, puan 1496.6, sıra 28/410, yüzdelik 0.934 |

Temsil modeli değişen ürünler: ChatGPT (gpt-6-astra-max → gpt-5.6-sol-xhigh); Claude (claude-sonnet-5.5-xhigh → claude-opus-5.5-high); Claude Code (Anthropic) (claude-sonnet-5.5-xhigh → claude-opus-5.5-high).

Aynı modellerle (temsil modeli sabit): karşılaştırılabilir 4, sıra korelasyonu -1. Aynı sonuç: sıra farkı model değişiminden değil, iki arenanın kendisinden geliyor.

- Uzun metin yazımı: sıra aynı kaldı ama temsil modeli değişen ürün var: Grok (grok-4.20-beta-0309-reasoning → grok-4.5).
- E-posta yazımı: sıra aynı kaldı ama temsil modeli değişen ürün var: ChatGPT (gpt-5.5-high → gpt-5.6-sol-xhigh).
- Düzeltme ve yeniden yazma: sıra aynı kaldı ama temsil modeli değişen ürün var: ChatGPT (gpt-5.5-high → gpt-5.6-sol-xhigh).
- Özetleme: sıra aynı kaldı ama temsil modeli değişen ürün var: ChatGPT (gpt-5.5-high → gpt-5.5-high, gpt-5.6-sol-xhigh).
- Çeviri: sıra aynı kaldı ama temsil modeli değişen ürün var: Claude (claude-opus-5.5-high → claude-fable-5.1-max).
- Genel asistan: sıra aynı kaldı ama temsil modeli değişen ürün var: ChatGPT (gpt-5.5-high → gpt-5.4-high); Claude (claude-opus-5.5-high → claude-opus-4-6-high); Grok (grok-4.20-beta-0309-reasoning → grok-4.5).
- Ürün fotoğrafı: sıra aynı kaldı ama temsil modeli değişen ürün var: FLUX (Black Forest Labs) (flux-2-max → flux-2-flex, flux-2-max).
Not: yüzdelik üst sıralarda sıkışır. Puan farkı güven aralığının içindeyse sıra değişimi gürültü olabilir; ham puanlara ve aralıklara bak.
- Web sitesi yapma: etkisiz — karşılaştırılabilir ürün 0; bu eşleme sıralamayı değiştiremez (ürünlerin çoğunun bu arenada bağlı modeli yok).
- Uygulama oluşturucu: etkisiz — karşılaştırılabilir ürün 0; bu eşleme sıralamayı değiştiremez (ürünlerin çoğunun bu arenada bağlı modeli yok).

## 6. Sınırlar

- LMArena genel insan tercihidir; belirli bir iş için "en iyi"yi kanıtlamaz. Alt kategoriler daha yakın bir vekildir, ama yine vekildir.
- Kategori eşlemeleri bir yargıdır ve Ferit onayı olmadan sıralamaya girmez. Türkçe için LMArena'da ayrı kategori görülmedi; Türkçe başarımı hakkında iddia kurulamaz.
- Bu rapor yalnızca eldeki veriyi sayar; yeni skor ya da sıralama üretmez.

Kaynak ve lisans: benchmark verisi LMArena (lmarena.ai) ve Artificial Analysis (artificialanalysis.ai) kaynaklıdır; gösterilirken kaynak adı görünür olmalı.
