# TASLAK — Ferit onaylamalı

`evals/golden.jsonl`'daki 40 sorgunun `expectedTask`, `acceptableTools` ve `needsClarification` değerleri taslaktır. Bu dosyada her satırın tek satırlık gerekçesi, altında da özellikle kontrol edilmesi gereken yerler var. Onaylayınca bu başlığı "Onaylandı — Ferit, <tarih>" yap; değiştirdiğin satırı golden.jsonl'da düzelt ve `npm test` çalıştır. Test, araç adlarının katalogla ve görevlerin `evals/tasks-draft.md` ile eşleştiğini kontrol ediyor.

Kabul listesi kuralı: `acceptableTools` = "ilk 3'te çıkarsa kullanıcıyı yanlış yere göndermemiş oluruz" dediğimiz araçlar. Belirsiz sorgularda (`?`) liste, makul yorumların hepsini kapsıyor.

## Satır gerekçeleri

| id | ? | Sorgu | expectedTask | Gerekçe |
| --- | --- | --- | --- | --- |
| tr-01 | | sunum hazırla | slides.create | Açık sunum isteği; sunum araçları + Canva. |
| tr-02 | | startup için pitch deck | slides.create | Pitch deck bir sunum; Canva hariç tutuldu, deck'e özel üç araç yeter. |
| tr-03 | ? | Instagram için reels videosu | video.edit-short-social | Elde çekim varsa düzenleme, yoksa üretim; iki yorumun araçları da kabul. |
| tr-04 | | youtube videosu için altyazı | video.subtitles | Altyazı işi; katalogda altyazı ekleyen tek araç OpusClip. |
| tr-05 | | python kodumda hata var | code.debug | Kod asistanları + hata ayıklamada güçlü genel sohbet modelleri. |
| tr-06 | | ürün fotoğrafı arka plan kaldır | image.background-remove | Mevcut fotoğrafı düzenleme; görsel üreticiler kabul dışı. |
| tr-07 | | freelancer olarak fatura şablonu | docs.create | Belge/şablon; katalogda muhasebe aracı yok. |
| tr-08 | | logo | image.logo | Logo; metin render'ı güçlü üreticiler + Canva + Midjourney. |
| tr-09 | ? | görsel lazım | image.generate | Ne tür görsel belirsiz; genel görsel araçları. |
| tr-10 | | reklam için 10 saniyelik sinematik bir video üretmek istiyorum | video.text-to-video | Sıfırdan sinematik üretim. |
| tr-11 | | e-öğrenme videolarım için Türkçe profesyonel seslendirme lazım | audio.tts-voiceover | Seslendirme; Türkçe ses destekleyen iki araç. |
| tr-12 | | reklam filmim için telifsiz fon müziği üretmek istiyorum | music.generate | Müzik üretimi. |
| tr-13 | | Zoom toplantılarımda otomatik not tutsun ve aksiyon maddelerini çıkarsın | audio.meeting-notes | Toplantı asistanı; tek aday Fathom. |
| tr-14 | | blog yazısı | text.write-longform | Uzun metin; genel LLM'ler + içerik araçları. |
| tr-15 | | İngilizce kira sözleşmesini Türkçeye çevirmem gerekiyor | text.translate | Belge çevirisi; genel LLM'ler. |
| tr-16 | | tezim için literatür taraması yapmam lazım | research.academic | Literatür taraması; Elicit + Perplexity. |
| tr-17 | | kod bilmiyorum ama restoranım için rezervasyon alan bir mobil uygulama yapmak istiyorum | code.app-builder | Kodsuz uygulama; geliştirici araçları kabul dışı. |
| tr-18 | | Excel'deki satış verilerimi analiz edip hangi ürünün satışının düştüğünü bulmak istiyorum | data.spreadsheet-analysis | Tek seferlik tablo analizi; dosya alan asistanlar. |
| tr-19 | ? | YouTube kanalım için ses lazım | audio.tts-voiceover | Seslendirme / klon / müzik belirsiz; üç yorumun araçları. |
| tr-20 | ? | sosyal medya için içerik üretmem lazım | design.social-graphic | Görsel / video / metin belirsiz; Canva üçünü de karşılıyor. |
| en-01 | | make slides for my quarterly sales review meeting | slides.create | Sunum. |
| en-02 | | I need a logo for my bakery with the shop name in it | image.logo | İsimli logo: metin render'ı güçlü araçlar. |
| en-03 | | generate a photorealistic image of a lighthouse at sunset | image.generate | Genel fotogerçekçi üretim. |
| en-04 | | text to video | video.text-to-video | Açık görev adı. |
| en-05 | ? | video | video.text-to-video | Tek kelime; üretim ya da düzenleme. |
| en-06 | | clone my voice so I can narrate my own audiobook | audio.voice-clone | Ses klonlama. |
| en-07 | | make a song | music.generate | Şarkı üretimi. |
| en-08 | | remove background noise and echo from my podcast recording | audio.cleanup | Ses temizleme; ElevenLabs Voice Isolator. |
| en-09 | | write ad copy for a Facebook campaign selling running shoes | text.marketing-copy | Reklam metni; pazarlama metni araçları + genel LLM'ler. |
| en-10 | | write a polite follow-up email to a client who hasn't paid their invoice yet | text.email | E-posta. |
| en-11 | | summarize a 60-page PDF report into one page of key findings | text.summarize | Uzun belge özeti; uzun bağlamlı modeller + NotebookLM. |
| en-12 | ? | help me with my thesis | research.academic | Literatür / yazım / özet belirsiz. |
| en-13 | | research the best CRM tools for a 10-person sales team and cite sources | research.web | Kaynakçalı web araştırması. |
| en-14 | | AI autocomplete in VS Code | code.assistant-ide | Editör içi tamamlama. |
| en-15 | ? | I want to make a website | code.website-builder | Kodlu mu kodsuz mu belirsiz. |
| en-16 | | build an interactive sales dashboard from our CRM data | data.dashboard | BI dashboard. |
| en-17 | | automatically send new Google Form responses to a Slack channel | automation.workflow | Uygulamalar arası otomasyon; tek aday n8n. |
| en-18 | ? | I need something for my cafe's instagram | design.social-graphic | Gönderi / reels / metin belirsiz. |
| en-19 | ? | AI for my small business marketing | text.marketing-copy | Metin / görsel / reklam belirsiz. |
| en-20 | | create a 3D model of a chair for my indie game | 3d.generate | Katalog boşluğu. |

## Özellikle kontrol et

1. **tr-06 (arka plan kaldırma):** Adobe Firefly Image 4'ün web uygulamasında arka plan kaldırma olduğunu varsaydım; doğrula. Canva'nın arka plan kaldırıcısı Pro planında, fiyat açısından önemli.
2. **tr-04 (altyazı):** Tek kabul OpusClip. Uzun bir YouTube videosunun tamamına altyazı için yeterli mi? Değilse satır "katalog boşluğu" olmalı (Descript, Kapwing, CapCut katalogda yok).
3. **tr-11 (Türkçe seslendirme):** Murf.ai'nin Türkçe ses desteği doğrulanmalı; yoksa listeden çıkar.
4. **en-08 (podcast temizleme):** ElevenLabs'ın katalog kaydında Voice Isolator geçmiyor ama ürün bunu yapıyor. Kabul mü, yoksa katalog boşluğu mu?
5. **en-02 (isimli logo):** Midjourney, metin render'ı zayıf olduğu için dışarıda bırakıldı; tr-08'de ("logo") ise kabul. Tutarlı mı?
6. **tr-18 (Excel analizi):** Power BI ve Tableau kabul dışı (tek seferlik analiz için ağır). Kabul etmek istersen ekle.
7. **Belirsiz 9 satır** (tr-03, tr-09, tr-19, tr-20, en-05, en-12, en-15, en-18, en-19): Kabul listeleri geniş, bu yüzden top3Hit'i kolaylaştırıyorlar. İstersen her birini en olası yorumun araçlarına daralt.
8. **tr-16 / en-11 (NotebookLM):** Literatür taramasında kabul dışı (sadece yüklenen kaynaklarla çalışıyor), belge özetinde kabul. Katalogdaki NotebookLM açıklaması ("otonom araştırma ajanı") üründen farklı; P2 göçünde düzeltilmeli.
9. **en-15 (web sitesi):** Geliştirici yorumu için Cursor kabul edildi. Kodsuz yoruma daraltmak istersen çıkar.
10. **tr-12 (telifsiz müzik):** Suno ve Udio'nun ücretsiz planında ticari kullanım kısıtlı olabilir. Şimdilik kabul; P2'deki `facts.commercialUse` ile netleşecek.
11. **en-20 (3D):** World Labs Marble sahne/dünya ürettiği için kabul dışı ve satır katalog boşluğu olarak işaretli. Marble'ı kabul edersen notu değiştir.

## Katalog boşlukları (P2/P8 keşfi için)

Tamamen boş: 3D nesne üretimi (en-20).
Tek araca kalanlar: toplantı notu (Fathom), otomasyon (n8n), altyazı (OpusClip), ses temizleme (ElevenLabs), ses klonlama (ElevenLabs).
Katalogda olmayan tanınmış ürünler: remove.bg/Photoroom, Descript/Kapwing/CapCut, Otter/Fireflies, DeepL, Consensus/Scite, Lovable/Bolt, Framer/Wix, Zapier/Make, Meshy/Tripo, Looka.

---

## P11 eki (2026-09-28) — 72 yeni satır, needsReview: true

`data/tasks.json`'a her göreve `keywords: { tr, en }` eklendi (en az 5+5) ve
`lib/intent/taskClassifier.ts` (kural katmanı + LLM yedeği) yazıldı. Bu 72
satır golden set'i 40'tan 112'ye çıkardı: 40 görevin HER BİRİ artık en az 2
satırda `expectedTask` olarak geçiyor (önceden 31 görev tek satırlıydı ya da
hiç yoktu). Aşağıdaki satırların `expectedTask`, `acceptableTools` ve
`needsClarification` değerleri TASLAK — ilk 40 satırla aynı kural: onaylayınca
bu başlığı "Onaylandı — Ferit, <tarih>" yap, satırdaki `needsReview` alanını
sil (ya da `false` yap), `npm test` çalıştır.

Kabul listesi kuralı aynı: "ilk 3'te çıkarsa kullanıcıyı yanlış yere
göndermemiş oluruz" dediğimiz araçlar; hepsi `data/products.json`'daki
AKTİF ürünlerden (validate:catalog bunu kontrol ediyor).

| id | ? | Sorgu | expectedTask | Gerekçe |
| --- | --- | --- | --- | --- |
| tr-21 |  | bu paragrafı yeniden yaz, daha resmi olsun | text.rewrite-edit | Ton değiştirme; genel LLM'ler. |
| en-21 |  | proofread this paragraph and fix the grammar | text.rewrite-edit | Düzeltme; genel LLM'ler. |
| tr-22 |  | genel bir yapay zeka asistanıyla sohbet etmek istiyorum | chat.general-assistant | Açık genel asistan isteği. |
| en-22 |  | I just want a chatbot to talk to about random things | chat.general-assistant | Genel sohbet; hepsi kabul. |
| tr-23 |  | yüklediğim PDF hakkında sorular sormak istiyorum | research.document-qa | Kendi belgesiyle soru-cevap. |
| en-23 |  | ask questions about a contract I uploaded | research.document-qa | Belge soru-cevap. |
| tr-24 |  | bu fotoğraftaki masayı sil, arkasındaki duvarı değiştir | image.edit | Var olan görseli düzenleme (nesne silme). |
| en-24 |  | add a hat to the person in this photo | image.edit | Görsele nesne ekleme. |
| tr-25 |  | online mağazam için ayakkabı ürün fotoğrafı çekmem lazım | image.product-photo | E-ticaret ürün görseli. |
| en-25 |  | create a clean studio product shot of my sneaker for the online store | image.product-photo | Ürün fotoğrafı. |
| tr-26 |  | eski bir fotoğrafın çözünürlüğünü artırmak istiyorum | image.upscale | Katalogda tek aday Leonardo AI (Topaz gibi özel upscaler yok). |
| en-26 |  | upscale this low resolution image to 4k | image.upscale | Görsel büyütme. |
| tr-27 |  | elimdeki bir fotoğrafı canlandırıp kısa bir videoya çevirmek istiyorum | video.image-to-video | Görselden video; sıfırdan üretim (text-to-video) değil. |
| en-27 |  | animate this still photo into a short video clip | video.image-to-video | Görselden video. |
| tr-28 |  | eğitim videom için metni okuyan bir yapay zeka avatarı istiyorum | video.avatar-presenter | Katalogda tek aday Synthesia. |
| en-28 |  | I want an ai avatar to present my training script on camera | video.avatar-presenter | Avatar sunuculu video. |
| tr-29 |  | bir saatlik podcast kaydımdan sosyal medyaya uygun kısa klipler çıkarmam lazım | video.repurpose-clips | Katalogda tek aday OpusClip. |
| en-29 |  | turn my hour-long youtube video into short clips for tiktok | video.repurpose-clips | Uzun videodan klip. |
| tr-30 |  | bir ses kaydındaki konuşmayı yazıya dökmem gerekiyor | audio.transcribe | Katalogda özel transkript aracı (Otter/Whisper arayüzü) yok; ElevenLabs'ın transkript özelliği kabul. |
| en-30 |  | transcribe this interview recording into text | audio.transcribe | Transkript. |
| tr-31 |  | terminalden çalışıp bütün kod tabanımı düzenleyebilen bir yapay zeka ajanı istiyorum | code.agent-cli | Katalogda tek aday Claude Code. |
| en-31 |  | I want an autonomous coding agent that runs in my terminal and edits my repo | code.agent-cli | Terminal kod ajanı. |
| tr-32 |  | blog için yazı yazdır | text.write-longform | Kısa sorgu. |
| en-32 |  | write a long article about remote work trends | text.write-longform | Uzun makale. |
| tr-33 |  | write email | text.email | Denetimde kural yolunda tanınmadığı belirtilen sorgulardan biri (docs/RouteAI-v3-Claude-Code-promptlari.md P11 bağlamı). |
| en-33 |  | draft a short thank-you email to a job interviewer | text.email | E-posta yazımı. |
| tr-34 |  | bu toplantı tutanağını tek paragrafta özetle | text.summarize | Metin özetleme (audio.meeting-notes'tan farklı: burada yazılı bir tutanak var, kayıt yok). |
| en-34 |  | give me a one-paragraph summary of this 40-page contract | text.summarize | Uzun belge özeti. |
| tr-35 |  | bu menüyü Almancaya çevirmem lazım | text.translate | Çeviri. |
| en-35 |  | translate this product manual from english to spanish | text.translate | Belge çevirisi. |
| tr-36 |  | İstanbul'daki en iyi kahve makinesi markalarını kaynak göstererek araştır | research.web | Kaynakçalı web araştırması. |
| en-36 |  | research the top project management tools for startups and cite your sources | research.web | Web araştırması. |
| tr-37 |  | cv hazırla | docs.create | Denetimde kural yolunda tanınmadığı belirtilen sorgulardan biri. |
| en-37 |  | help me build a resume for a marketing job | docs.create | Özgeçmiş. |
| tr-38 |  | arka plan kaldır | image.background-remove | Denetimde kural yolunda tanınmadığı belirtilen sorgulardan biri; gerçek RouteAI'da 2026-09-28'de yanlış öneri (Le Chat) verdiği gözlendi. |
| en-38 |  | remove the background from this headshot | image.background-remove | Arka plan kaldırma. |
| tr-39 |  | instagram reels için elimdeki ham çekimi düzenlemem lazım | video.edit-short-social | Elde çekim var; düzenleme. |
| en-39 |  | edit my raw footage into a tiktok video with captions | video.edit-short-social | Kısa sosyal medya videosu. |
| tr-40 |  | İngilizce videoma Türkçe altyazı eklemek istiyorum | video.subtitles | Altyazı çevirisi dahil. |
| en-40 |  | auto-generate captions for my youtube video | video.subtitles | Altyazı. |
| tr-41 |  | kendi sesimin klonunu çıkarıp sesli kitabımı onunla seslendirmek istiyorum | audio.voice-clone | Ses klonlama. |
| en-41 |  | make a synthetic copy of my own voice for future narration | audio.voice-clone | Ses klonlama. |
| tr-42 |  | podcast kaydımdaki arka plan gürültüsünü ve yankıyı temizlemem lazım | audio.cleanup | Ses temizleme. |
| en-42 |  | clean up the hiss and echo in this voice recording | audio.cleanup | Ses temizleme. |
| tr-43 |  | toplantı notu | audio.meeting-notes | Denetimde kural yolunda tanınmadığı belirtilen sorgulardan biri. |
| en-43 |  | record my weekly standup and give me the action items | audio.meeting-notes | Toplantı notu. |
| tr-44 |  | VS Code içinde kod tamamlayan bir yapay zeka eklentisi istiyorum | code.assistant-ide | Editör içi kod asistanı. |
| en-44 |  | AI autocomplete in VS Code | code.assistant-ide | evals/golden.jsonl en-14 ile aynı sorgu; kural katmanının otomatik tamamlama sorgularını tanıdığını ayrıca doğrular. |
| tr-45 |  | JavaScript kodum sürekli undefined hatası veriyor, bulamıyorum | code.debug | Hata ayıklama. |
| en-45 |  | why is my react component re-rendering infinitely, help me fix it | code.debug | Debug. |
| tr-46 |  | kod yazmayı bilmiyorum ama küçük işletmem için stok takip uygulaması yapmak istiyorum | code.app-builder | Kodsuz uygulama. |
| en-46 |  | build a simple inventory tracking app without writing any code | code.app-builder | No-code app builder. |
| tr-47 |  | web sitesi yapmak istiyorum | code.website-builder | 2026-09-28'de canlıda test edilen gerçek sorgu; RouteAI o gün Le Chat (Mistral) önerdi (kanıtsız v1 sıralaması + kategori/çıktı türü örtüşmesi). P12 bu görevle çözülecek. |
| en-47 |  | I want to make a website for my photography portfolio | code.website-builder | Web sitesi. |
| tr-48 |  | son 3 aylık satış tablomu analiz edip trend çıkarır mısın | data.spreadsheet-analysis | Tablo analizi. |
| en-48 |  | analyze this csv of customer churn and tell me the main drivers | data.spreadsheet-analysis | Excel analizi. |
| tr-49 |  | satış ekibim için canlı güncellenen bir dashboard hazırlamak istiyorum | data.dashboard | BI dashboard. |
| en-49 |  | build an executive dashboard that pulls live data from our database | data.dashboard | Dashboard. |
| tr-50 |  | yeni bir müşteri formu dolduğunda otomatik olarak CRM'ime eklensin istiyorum | automation.workflow | Katalogda tek aday n8n. |
| en-50 |  | automatically send new Stripe payments to a Google Sheet | automation.workflow | İş akışı otomasyonu. |
| tr-51 |  | bahçe için bir 3D bank modeli oluşturmak istiyorum | 3d.generate | katalog boşluğu (bkz. en-20): World Labs Marble tekil nesne değil sahne/dünya üretiyor. |
| en-51 |  | generate a 3d model of a lamp for my game asset library | 3d.generate | katalog boşluğu; en-20/tr-51 ile aynı gerekçe. |
| tr-52 |  | podcast kapağı | image.generate | P11 bağlamında geçen "projenin tek parçası" örneği: podcast'in kendisi değil, tek bir kapak görseli isteniyor (tek araç yeter). |
| tr-53 |  | podcast için kapak görseli istiyorum | image.generate | Proje kelimesi ("podcast") geçse de "kapak" tek parça isteği; workflow değil. |
| en-52 |  | cover art for my podcast | image.generate | Tek parça görsel isteği. |
| tr-54 |  | e-kitabım için kapak tasarlamak istiyorum | image.generate | E-kitap projesinin tek parçası (kapak); v1'de "e-kitap" kelimesi tüm projeyi workflow'a sokuyordu (bkz. lib/intent/parser.ts MULTI_STEP_KEYWORDS), ama burada sadece kapak isteniyor. |
| tr-55 |  | youtube kanalım için video senaryosu yazmam lazım | text.write-longform | "youtube kanalı" projesinin tek parçası (senaryo metni); video üretimi değil. |
| tr-56 |  | müzik albümüm için kapak görseli lazım | image.generate | "albüm" projesinin tek parçası olan kapak görseli; albümün kendisi (music.generate) değil. |
| tr-57 | ? | bir şeyler yapmak istiyorum ama ne yapacağımı bilmiyorum | chat.general-assistant | Tamamen belirsiz; genel asistan en makul yorum, netleştirme sorulmalı. |
| en-53 | ? | help me with content for my business | text.marketing-copy | Metin mi görsel mi belirsiz; en-19 ile aynı görev, farklı ifade. |
| tr-58 | ? | işim için yapay zeka aracı lazım | chat.general-assistant | Aşırı belirsiz sorgu; hangi görev olduğu netleşmeden öneri verilmemeli. |
| en-54 | ? | I need content for my brand | text.marketing-copy | Metin mi görsel mi belirsiz (en-19/en-53 ile aynı görev, üçüncü bir ifade varyasyonu). |

### Özellikle kontrol et

1. **tr-30 / en-30 (transkript):** Katalogda Otter/Whisper gibi özel bir transkript arayüzü yok; ElevenLabs'ın transkript özelliği kabul edildi. Doğrula.
2. **tr-26 (görsel büyütme):** Katalogda Topaz gibi özel bir upscaler yok; tek aday Leonardo AI. Leonardo'nun gerçekten ayrı bir "upscale" özelliği var mı doğrula.
3. **tr-38 (arka plan kaldır):** 2026-09-28'de gerçek RouteAI sitesinde bu sorguya yakın "web sitesi yapmak istiyorum" (tr-47) yanlış öneri (Le Chat) verdi; tr-38 ayrı bir görev (image.background-remove) ama aynı denetim notunun bir parçası — ikisi de P9/P10 sonrası P11/P12 ile düzeliyor.
4. **tr-47 (web sitesi):** Bu, denetimde canlıda gözlemlenen gerçek hatalı öneri örneği. `acceptableTools` listesindeki Cursor/Gamma AI/Replit Agent/Base44 doğru mu, yoksa Gamma AI (sunum aracı) burada fazla mı — kontrol et.
5. **tr-52/tr-53/en-52/tr-54/tr-56 ("kapak" örnekleri):** Hepsi image.generate'e bağlandı (katalogda özel bir "cover art" aracı yok). Bu doğru bir basitleştirme mi, yoksa design.social-graphic daha mı uygun olur? Karar ver.
6. **tr-57/en-53/tr-58/en-54 (aşırı belirsiz sorgular):** chat.general-assistant ve text.marketing-copy'ye bağlandı; bunlar gerçekten "netleştirme sorulmalı" örnekleri mi yoksa farklı bir görev mi olmalı, gözden geçir.
7. **en-44:** evals/golden.jsonl'daki en-14 ile AYNI sorgu, kasıtlı tekrar (kural katmanının tutarlılığını doğrular). İstersen sil, zorunlu değil.

## Canlı tarama eki (2026-09-28) — 16 satır, needsReview: true

Canlıda bulunan yanlış eşleşmelerden (Ferit: "C# programı yapmak istiyorum" → no-code araçlar) sonra ~75 gerçekçi sorguyla yapılan taramadan: tr-59 … tr-71, en-55 … en-57. Kural katmanının emin ama yanlış olduğu 4 durum düzeltildi: "metni sese çevir" (Çeviri → Seslendirme), "youtube thumbnail yap" ve "podcast sesini temizle" (iş akışı → tek parça), "instagram gönderisi için açıklama yaz" (görsel → metin). Kontrol et: beklenen görev ve kabul edilen araçlar mantıklı mı?

## Katalog genişletme eki (2026-10-18) — 30 satır, needsReview: true

Kerem genel iş kataloğunun genişletilmesini istedi; 15 yeni iş ve 45 yeni ürün kataloğa girdi (kaynak kanıtı: `data/yeni-isler-rapor.md`). Bu 30 satır (her yeni iş için tr + en) `evals/golden.jsonl` sonuna `tr-72…tr-86`, `en-58…en-72` olarak eklendi. `expectedTask` değerleri TASLAK: onaylayınca bu başlığı "Onaylandı — Ferit, <tarih>" yap, satırdaki `needsReview` alanını sil (ya da `false` yap), `npm test` çalıştır.

Hepsinin `acceptableTools` listesi BOŞ ve notunda "katalog boşluğu" yazıyor: golden kabul listesi v1 araç listesinden (`lib/tools-database.json`) kontrol ediliyor ve yeni ürünler orada yok. Bu yüzden bu satırlar yalnızca GÖREV eşleşmesini (taskMatch) ölçer; araç isabetini (top1/top3) ölçmez.

| id | ? | Sorgu | expectedTask | Gerekçe |
| --- | --- | --- | --- | --- |
| tr-72 |  | unity ile oyun yapmak istiyorum | game.dev | Oyun geliştirme: yeni iş. Katalogdaki araçlar: Bezi, GDevelop, Rosebud AI, Unity AI. |
| en-58 |  | help me make a game in godot | game.dev | Oyun geliştirme: yeni iş. Katalogdaki araçlar: Bezi, GDevelop, Rosebud AI, Unity AI. |
| tr-73 |  | oyunum için piksel sanat karakter sprite lazım | game.asset-art | Oyun görseli ve varlıkları: yeni iş. Katalogdaki araçlar: Ludo.ai, PixelLab, Scenario. |
| en-59 |  | generate 2d game assets and sprite sheets | game.asset-art | Oyun görseli ve varlıkları: yeni iş. Katalogdaki araçlar: Ludo.ai, PixelLab, Scenario. |
| tr-74 |  | mobil uygulamam için arayüz tasarlamak istiyorum | design.ui-prototype | Arayüz tasarımı ve prototip: yeni iş. Katalogdaki araçlar: Figma Make, Uizard, v0. |
| en-60 |  | I need a wireframe and ui prototype for my app | design.ui-prototype | Arayüz tasarımı ve prototip: yeni iş. Katalogdaki araçlar: Figma Make, Uizard, v0. |
| tr-75 |  | b2b satış için potansiyel müşteri listesi çıkar | sales.prospecting | Müşteri adayı bulma: yeni iş. Katalogdaki araçlar: Apollo.io, Clay, Instantly. |
| en-61 |  | find leads for cold outreach to saas founders | sales.prospecting | Müşteri adayı bulma: yeni iş. Katalogdaki araçlar: Apollo.io, Clay, Instantly. |
| tr-76 |  | web sitem için müşteri destek botu kurmak istiyorum | support.chatbot | Müşteri destek botu: yeni iş. Katalogdaki araçlar: Chatbase, Intercom Fin, Tidio. |
| en-62 |  | I want an ai support agent that answers customer questions on my site | support.chatbot | Müşteri destek botu: yeni iş. Katalogdaki araçlar: Chatbase, Intercom Fin, Tidio. |
| tr-77 |  | küçük işletmem için muhasebe ve gider takibi | finance.bookkeeping | Muhasebe ve gider takibi: yeni iş. Katalogdaki araçlar: QuickBooks, Xero, Zoho Books. |
| en-63 |  | bookkeeping software for my small business expenses | finance.bookkeeping | Muhasebe ve gider takibi: yeni iş. Katalogdaki araçlar: QuickBooks, Xero, Zoho Books. |
| tr-78 |  | blog yazılarım için seo anahtar kelime araştırması | marketing.seo | SEO içeriği: yeni iş. Katalogdaki araçlar: Frase, Surfer, Writesonic (SEO Content). |
| en-64 |  | optimize my article for seo and rank on google | marketing.seo | SEO içeriği: yeni iş. Katalogdaki araçlar: Frase, Surfer, Writesonic (SEO Content). |
| tr-79 |  | ekibim için proje yönetimi ve görev takibi aracı | project.management | Proje ve görev yönetimi: yeni iş. Katalogdaki araçlar: Asana, ClickUp Brain (Project AI), monday.com. |
| en-65 |  | a tool for project management and tracking team tasks | project.management | Proje ve görev yönetimi: yeni iş. Katalogdaki araçlar: Asana, ClickUp Brain (Project AI), monday.com. |
| tr-80 |  | bana matematiği adım adım öğretecek yapay zeka öğretmen | education.tutor | Yapay zekâ öğretmen: yeni iş. Katalogdaki araçlar: ChatGPT, Gemini, Khanmigo, Photomath. |
| en-66 |  | an ai tutor to help me study for my exam | education.tutor | Yapay zekâ öğretmen: yeni iş. Katalogdaki araçlar: ChatGPT, Gemini, Khanmigo, Photomath. |
| tr-81 |  | ingilizce konuşma pratiği yapmak istiyorum | education.language-learning | Yabancı dil öğrenme: yeni iş. Katalogdaki araçlar: Duolingo, Praktika, Speak. |
| en-67 |  | I want to learn spanish and practice speaking | education.language-learning | Yabancı dil öğrenme: yeni iş. Katalogdaki araçlar: Duolingo, Praktika, Speak. |
| tr-82 |  | yapay zeka tarayıcı ile sekmelerimle sohbet etmek istiyorum | agent.browser | Yapay zekâlı tarayıcı: yeni iş. Katalogdaki araçlar: Dia, Opera Neon, Perplexity Comet. |
| en-68 |  | an ai browser that can browse the web for me | agent.browser | Yapay zekâlı tarayıcı: yeni iş. Katalogdaki araçlar: Dia, Opera Neon, Perplexity Comet. |
| tr-83 |  | gelen kutumu düzenleyen e-posta asistanı | productivity.inbox | E-posta kutusu yönetimi: yeni iş. Katalogdaki araçlar: Fyxer, Shortwave, Superhuman. |
| en-69 |  | an email assistant to manage my inbox and draft replies | productivity.inbox | E-posta kutusu yönetimi: yeni iş. Katalogdaki araçlar: Fyxer, Shortwave, Superhuman. |
| tr-84 |  | günümü planla, görevlerimi takvime yerleştir | productivity.planning | Takvim ve günlük planlama: yeni iş. Katalogdaki araçlar: Akiflow, Motion, Reclaim. |
| en-70 |  | ai calendar assistant to plan my day | productivity.planning | Takvim ve günlük planlama: yeni iş. Katalogdaki araçlar: Akiflow, Motion, Reclaim. |
| tr-85 |  | notlarım arasında arama yapabileceğim not uygulaması | productivity.notes | Not alma ve bilgi yönetimi: yeni iş. Katalogdaki araçlar: Mem, Notion AI, Reflect. |
| en-71 |  | a notes app that works like a second brain | productivity.notes | Not alma ve bilgi yönetimi: yeni iş. Katalogdaki araçlar: Mem, Notion AI, Reflect. |
| tr-86 |  | iş ilanına göre özgeçmişimi geliştir, ats uyumlu olsun | career.resume | Özgeçmişi ilana göre uyarlama: yeni iş. Katalogdaki araçlar: Kickresume, Rezi, Teal (Resume Builder AI). |
| en-72 |  | tailor my resume to a job posting and make it ats-friendly | career.resume | Özgeçmişi ilana göre uyarlama: yeni iş. Katalogdaki araçlar: Kickresume, Rezi, Teal (Resume Builder AI). |

### Özellikle kontrol et

1. **Kanıt yok başlangıcı:** Bu 15 işin hiçbirinde benchmark ve RouteAI kanıtı yok; ekranda araçlar alfabetik ve sıralama iddiası olmadan listelenir (mevcut 40 işin 21'i de böyle). Satırlar yalnızca "doğru işe düştü mü" sorusunu ölçer.
2. **tr-86 / en-72 (career.resume) ile tr-37 / en-37 (docs.create):** "cv hazırla" ve "help me build a resume for a marketing job" bilerek `docs.create`'te kaldı (Kerem kararı). Yeni iş yalnızca "ats uyumlu özgeçmiş", "özgeçmişimi iş ilanına göre geliştir", "tailor my resume" gibi özel cümlelerde devreye girer. Bu ayrım doğru görünüyorsa dokunma; "cv/özgeçmiş" sözcüklerini docs.create'ten alıp tr-37/en-37'yi career.resume'e çevirmek ayrı bir onay ister.
3. **en-36 (research.web) ile project.management:** en-36 ("research the top project management tools…") `research.web` bekliyor; project.management çıplak "project management" ifadesini almadığı için çakışmıyor (test kilitler).
4. **en-20 / tr-51 / en-51 (3d.generate, "katalog boşluğu" notlu):** 3D araçları artık katalogda (Meshy, Tripo, Hyper3D Rodin), yani bu boşluk kapandı. Ancak `acceptableTools` v1 araç listesinden kontrol edildiği için bu adları ekleyemiyoruz; v1 listesi güncellenince bu satırların notlarını ve araç listelerini yenile.
5. **Komşu işlerle sınır:** tr-77 / en-63 (finance.bookkeeping) ile data.spreadsheet-analysis, tr-83 / en-69 (productivity.inbox) ile text.email, tr-85 / en-71 (productivity.notes) ile audio.meeting-notes en kolay karışan yerler. Sınırı farklı çizmek istersen expectedTask'ı değiştir.
6. **Sözleşme inceleme yok:** `legal.contract-review` taslakta vardı, Kerem kararıyla kataloğa alınmadı; golden'da da satırı yok.
7. **Bağımsız değil:** Yeni işlerin anahtar kelimelerini bu satırlara bakarak ayarladım; kural katmanının 30/30 doğru çıkması bağımsız bir kanıt değil. Gerçek kullanıcı sorgularında ne olacağını canlıdaki `clarifyRate` ve görev dağılımı gösterecek.

## Editör seçimi eki (2026-10-18) — 15 yeni iş için TASLAK seçim

Kerem, yeni işlerin ekranının "sunum hazırla" gibi eski işlerle aynı olmasını istedi (`Bu iş için henüz güvenilir veri yok` ekranı çıkmasın). Eski işlerde bu ekranı `data/editor-picks.json` sağlıyor: kanıt yokken görev başına bir "Editör seçimi" ana araç olur, diğerleri "Diğer araçlar (henüz doğrulanmadı)" altında listelenir. Yeni 15 işe de aynı biçimde birer TASLAK seçim eklendi (`by: "RouteAI editör (taslak, Ferit onayı bekliyor)"`, tarih 2026-10-18).

Bu seçimler öznel bir karardır; benim koyduğum ölçüt: (1) aracın resmi sayfası görevi doğrudan anlatıyor, (2) genel kullanıcı için başlangıç, (3) eşitlikte sayfada ücretsiz başlangıcı net yazan araç. Gerekçe metni yalnızca işlev tanımıdır (üstünlük ve fiyat iddiası yok). Ferit değiştirmek isterse `data/editor-picks.json`'da `productId`'yi aynı işteki başka bir aktif ürünle değiştirmek yeter.

| İş | Seçilen | Gerekçe (ekranda yazan) |
| --- | --- | --- |
| game.dev (Oyun geliştirme) | Rosebud AI | Metin istemlerinden oynanabilir oyun üretir; kod yazmak gerekmez. |
| game.asset-art (Oyun görseli ve varlıkları) | Scenario | Oyun varlıkları için görsel, doku ve 3D model üretir. |
| design.ui-prototype (Arayüz tasarımı ve prototip) | Figma Make | Fikirlerini Figma içinde prototipe çevirir; düzenleyip yayına alabilirsin. |
| sales.prospecting (Müşteri adayı bulma) | Apollo.io | Kişi ve şirket veritabanından potansiyel müşteri bulur; doğrulanmış e-posta ve telefon ile erişim dizileri sunar. |
| support.chatbot (Müşteri destek botu) | Tidio | Müşteri hizmetleri için yapay zekâlı sohbet botu yazılımı. |
| finance.bookkeeping (Muhasebe ve gider takibi) | QuickBooks | Çevrimiçi muhasebe yazılımı; gider sınıflandırma ve yapay zekâ sohbeti gibi özellikleri var. |
| marketing.seo (SEO içeriği) | Surfer | Arama motorları ve yapay zekâ aramaları için içerik yazmana ve optimize etmene yardım eder. |
| project.management (Proje ve görev yönetimi) | Asana | Görev ve projeleri planlayıp takip etmek için iş yönetimi platformu; AI Teammates ve AI Studio özellikleri var. |
| education.tutor (Yapay zekâ öğretmen) | ChatGPT | Çalışma modu (study mode), soruyu doğrudan cevaplamak yerine adım adım çözdürerek öğrenmeyi destekler. |
| education.language-learning (Yabancı dil öğrenme) | Speak | Canlı öğretmen olmadan yapay zekâyla gerçek konuşma pratiği yaptırır. |
| agent.browser (Yapay zekâlı tarayıcı) | Dia | Yapay zekâ asistanı olan ve sekmelerinle sohbet etmeni sağlayan tarayıcı. |
| productivity.inbox (E-posta kutusu yönetimi) | Fyxer | Gelen kutunu düzenler, senin tonunda yanıt taslağı yazar ve toplantı notu alır. |
| productivity.planning (Takvim ve günlük planlama) | Reclaim | Çalışma, toplantı ve günlük işleri otomatik zamanlayan yapay zekâ ajanları. |
| productivity.notes (Not alma ve bilgi yönetimi) | Mem | Notları, toplantıları ve fikirleri bağlam içinde birleştiren, Mem Agent’lı not uygulaması. |
| career.resume (Özgeçmişi ilana göre uyarlama) | Rezi | Özgeçmişi yapay zekâyla hazırlar, geliştirir ve iş ilanına göre uyarlar. |

### Özellikle kontrol et

1. **Seçimler öznel:** Her işte 3-4 araç var; hangisinin "Editör seçimi" olacağı bir editör kararı. Beğenmediğin seçimi değiştir.
2. **education.tutor → ChatGPT:** Bu işte Khanmigo ve Photomath de var. ChatGPT'yi seçtim çünkü sayfası (study mode) görevi doğrudan anlatıyor ve ücretsiz kullanıcılara açık. ChatGPT zaten docs.create ve data.spreadsheet-analysis işlerinin de seçimi.
3. **game.dev → Rosebud AI:** "unity ile oyun yapmak istiyorum" gibi bir sorguda ana araç Unity'ye özel değil (Rosebud kodsuz, tarayıcıda). Unity AI ve Bezi "Diğer araçlar" altında. Unity odaklı sorgular için Unity AI daha uygun olabilir; karar senin.
4. **3d.generate:** Bu işin mevcut seçimi World Labs Marble (sahne/dünya üretir, tek nesne değil). Artık Meshy, Tripo ve Hyper3D Rodin (tek 3D nesne) de katalogda; seçimi değiştirmek istersen `data/editor-picks.json`'daki 3d.generate satırı. Bu turda dokunulmadı.
5. **Ekranda hâlâ "henüz doğrulanmadı" yazan yerler:** Seçilmeyen araçların başlığı "Diğer araçlar (henüz doğrulanmadı)"; eski işlerle aynı metin, değiştirilmedi.

## Cümle seti (`evals/sentences.jsonl`) — TASLAK, Ferit onaylamalı (2026-10-19)

126 günlük cümle (65 `dev`, 61 `heldout`). `expectedTask`, `acceptableTasks` ve `needsClarification` değerlerini Claude yazdı; hiçbiri başka bir kaynaktan doğrulanmadı. Ferit'ten istenen: (1) her cümlenin beklenen görevi doğru mu, (2) "kabul edilir" ikinci görevler makul mu, (3) belirsiz saydığımız 4 cümle gerçekten belirsiz mi. `heldout` satırlarını ayar yaparken tek tek incelemeyin; ayar gerekiyorsa yeni cümleler ekleyip onları bekletin. Ölçüm: `npm run eval:sentences`. Kural katmanı bu cümlelerin hiçbirinde yanlış göreve özgüvenle gitmemeli (`sentenceEvidence.test.ts` kilitler); etiket hatalıysa bu test yanlış alarm verebilir.
