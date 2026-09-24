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
