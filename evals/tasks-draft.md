# Görev kimlikleri — TASLAK (P1)

> **P2'den itibaren kaynak `data/tasks.json`.** Bu dosya P1'deki taslak listedir; kimlikler `tasks.json` ile birebir aynı kaldı, golden'daki 40 `expectedTask` değerinin hepsi eşleşiyor (`npm run validate:catalog` ve `npm test` kontrol ediyor).

`evals/golden.jsonl`'daki `expectedTask` değerleri bu listeden gelir. Liste, ROADMAP'teki P2 planındaki 40 görevle birebir aynı.

Biçim: `grup.görev` (küçük harf, tire). Tanımlar tek satır; asıl etiket ve açıklamalar P2'de `tasks.json`'a yazılacak.

"Golden" sütunu bu görevi bekleyen sorguları gösteriyor. 29 görevin golden'da sorgusu var, 11'inin yok.

| Görev | Ne | Golden |
| --- | --- | --- |
| **Metin** | | |
| `text.write-longform` | Blog yazısı, makale, uzun içerik | tr-14 |
| `text.marketing-copy` | Reklam metni, slogan, ürün açıklaması, kampanya metni | en-09, en-19 |
| `text.email` | E-posta yazma ve yanıtlama | en-10 |
| `text.summarize` | Uzun metin ya da belgeyi özetleme | en-11 |
| `text.translate` | Metin ve belge çevirisi | tr-15 |
| `text.rewrite-edit` | Metni düzeltme, yeniden yazma, ton değiştirme | — |
| `chat.general-assistant` | Genel amaçlı sohbet asistanı | — |
| **Araştırma** | | |
| `research.web` | Kaynak gösteren web araştırması | en-13 |
| `research.academic` | Akademik literatür taraması, makale bulma ve analiz | tr-16, en-12 |
| `research.document-qa` | Yüklenen belgelerle soru-cevap | — |
| **Sunum ve belge** | | |
| `slides.create` | Sunum ve pitch deck hazırlama | tr-01, tr-02, en-01 |
| `docs.create` | Belge, şablon, form hazırlama (fatura, özgeçmiş, teklif) | tr-07 |
| **Görsel ve tasarım** | | |
| `image.generate` | Metinden görsel üretimi | tr-09, en-03 |
| `image.logo` | Logo tasarımı | tr-08, en-02 |
| `image.edit` | Görsel düzenleme (nesne ekleme/silme, stil) | — |
| `image.product-photo` | Ürün fotoğrafı üretimi | — |
| `image.background-remove` | Arka plan kaldırma | tr-06 |
| `image.upscale` | Görsel büyütme / netleştirme | — |
| `design.social-graphic` | Sosyal medya görseli ve şablon tasarımı | tr-20, en-18 |
| **Video** | | |
| `video.text-to-video` | Metinden video üretimi | tr-10, en-04, en-05 |
| `video.image-to-video` | Görselden video (fotoğraf canlandırma) | — |
| `video.edit-short-social` | Kısa sosyal medya videosu düzenleme (reels, shorts, TikTok) | tr-03 |
| `video.subtitles` | Videoya altyazı ekleme / altyazı çevirisi | tr-04 |
| `video.avatar-presenter` | Avatar sunuculu video | — |
| `video.repurpose-clips` | Uzun videodan kısa klip çıkarma | — |
| **Ses ve müzik** | | |
| `audio.tts-voiceover` | Metinden konuşma, seslendirme | tr-11, tr-19 |
| `audio.voice-clone` | Ses klonlama | en-06 |
| `audio.transcribe` | Ses/video dökümü (transkript) | — |
| `audio.cleanup` | Gürültü giderme, ses iyileştirme (podcast) | en-08 |
| `audio.meeting-notes` | Toplantı kaydı, not ve aksiyon maddeleri | tr-13 |
| `music.generate` | Müzik ve şarkı üretimi | tr-12, en-07 |
| **Kod** | | |
| `code.assistant-ide` | Editör içi kod asistanı, otomatik tamamlama | en-14 |
| `code.agent-cli` | Terminalde çalışan kod ajanı | — |
| `code.debug` | Hata ayıklama | tr-05 |
| `code.app-builder` | Kod bilmeden uygulama yapma | tr-17 |
| `code.website-builder` | Web sitesi yapma | en-15 |
| **Veri ve otomasyon** | | |
| `data.spreadsheet-analysis` | Excel/tablo verisi analizi | tr-18 |
| `data.dashboard` | Dashboard ve BI raporu | en-16 |
| `automation.workflow` | Uygulamalar arası iş akışı otomasyonu | en-17 |
| **3D** | | |
| `3d.generate` | 3D model / sahne üretimi | en-20 |

## Notlar

- P1 kapsamında sorgusu olmayan görevler: `text.rewrite-edit`, `chat.general-assistant`, `research.document-qa`, `image.edit`, `image.product-photo`, `image.upscale`, `video.image-to-video`, `video.avatar-presenter`, `video.repurpose-clips`, `audio.transcribe`, `code.agent-cli`. Golden set büyütülürse önce bunlara sorgu eklenmeli.
- Belirsiz sorgularda (`needsClarification: true`) `expectedTask` en olası yorumdur; diğer yorumlar satırın `notes` alanında yazıyor.
