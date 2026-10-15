---
# TASLAK — reviewedBy boş (rehberin tamamı incelenmedi).
# Kaynak: Suno Create ekranı (Advanced, v6-mini), Ferit'in ekran görüntüleri (2026-10-16) ve
# Help Center "Music Glossary for Suno" (Ferit yapıştırdı, 2026-10-15; adres kaydedilmedi).
# v4: Styles ve Lyrics ayrı alanlar. prompt = Styles (İngilizce, virgüllü), sözler "Lyrics"
# ayarında; v3 ikisini tek metinde birleştiriyordu ("Style: … Lyrics: Verse 1: …").
id: "suno"
version: 4
appliesTo: ["suno-ai"]
modality: "music"
promptLanguage: "en"
sources: ["https://suno.com/create"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "genre"
  impact: "high"
  question:
    en: "Which genre?"
    tr: "Hangi tür?"
  options:
  - id: "pop"
    label:
      en: "Pop"
      tr: "Pop"
    value: "pop"
  - id: "rock"
    label:
      en: "Rock"
      tr: "Rock"
    value: "rock"
  - id: "hiphop"
    label:
      en: "Hip-hop"
      tr: "Hip-hop"
    value: "hip-hop"
  - id: "electronic"
    label:
      en: "Electronic"
      tr: "Elektronik"
    value: "electronic"
  - id: "acoustic"
    label:
      en: "Acoustic"
      tr: "Akustik"
    value: "acoustic"
  default: "infer"
- id: "mood"
  impact: "high"
  question:
    en: "What mood?"
    tr: "Nasıl bir duygu?"
  options:
  - id: "upbeat"
    label:
      en: "Upbeat"
      tr: "Neşeli"
    value: "upbeat"
  - id: "melancholic"
    label:
      en: "Melancholic"
      tr: "Hüzünlü"
    value: "melancholic"
  - id: "epic"
    label:
      en: "Epic"
      tr: "Destansı"
    value: "epic"
  - id: "calm"
    label:
      en: "Calm"
      tr: "Sakin"
    value: "calm"
  default: "infer"
- id: "vocals"
  impact: "high"
  question:
    en: "Vocals?"
    tr: "Vokal?"
  options:
  - id: "female"
    label:
      en: "Female vocals"
      tr: "Kadın vokal"
    value: "female vocals"
  - id: "male"
    label:
      en: "Male vocals"
      tr: "Erkek vokal"
    value: "male vocals"
  - id: "instrumental"
    label:
      en: "Instrumental"
      tr: "Enstrümantal"
    value: "instrumental"
  - id: "duet"
    label:
      en: "Duet"
      tr: "Düet"
    value: "duet"
  default: "infer"
- id: "tempo"
  impact: "medium"
  question:
    en: "Tempo?"
    tr: "Tempo?"
  options:
  - id: "slow"
    label:
      en: "Slow"
      tr: "Yavaş"
    value: "slow tempo"
  - id: "mid"
    label:
      en: "Medium"
      tr: "Orta"
    value: "mid tempo"
  - id: "fast"
    label:
      en: "Fast"
      tr: "Hızlı"
    value: "fast tempo"
  default: "mid"
- id: "theme"
  impact: "medium"
  question:
    en: "What is the song about?"
    tr: "Şarkı ne hakkında?"
  options:
  - id: "love"
    label:
      en: "Love"
      tr: "Aşk"
    value: "love"
  - id: "motivation"
    label:
      en: "Motivation"
      tr: "Motivasyon"
    value: "motivation"
  - id: "jingle"
    label:
      en: "A brand jingle"
      tr: "Marka jingle'ı"
    value: "brand jingle"
  - id: "story"
    label:
      en: "A story"
      tr: "Bir hikâye"
    value: "a story"
  default: "infer"
refinements:
- id: "instrumental"
  label:
    en: "Instrumental"
    tr: "Enstrümantal"
  patch:
    vocals: "instrumental"
- id: "faster"
  label:
    en: "Faster"
    tr: "Daha hızlı"
  patch:
    tempo: "fast tempo"
- id: "sadder"
  label:
    en: "Sadder"
    tr: "Daha hüzünlü"
  patch:
    mood: "melancholic"
- id: "energetic"
  label:
    en: "More energy"
    tr: "Daha enerjik"
  instruction: "Increase energy: stronger drums and a bigger chorus."
- id: "short-lyrics"
  label:
    en: "Shorter lyrics"
    tr: "Daha kısa sözler"
  instruction: "Shorten the lyrics to one verse and one chorus."
- id: "hook"
  label:
    en: "Catchier chorus"
    tr: "Akılda kalan nakarat"
  instruction: "Make the chorus a short, repeatable hook."
checklist: ["Genre", "Mood", "Vocal type or instrumental", "Tempo", "Theme or lyrics"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "vocals"
  type: "regex"
  value: "(vocal|vokal|instrumental|enstrümantal|singer|şarkıcı|voice|duet|düet|rap|choir|koro)"
  flags: "i"
  criterion: "toolReadiness"
  message: "State the vocal type, or that the track is instrumental."
- id: "genre"
  type: "regex"
  value: "(style|stil|genre|tür|pop|rock|hip-hop|electronic|elektronik|acoustic|akustik|jazz|caz|folk|türkü|r&b|metal|classical|klasik|lo-fi|house|techno|ambient|arabesk)"
  flags: "i"
  criterion: "toolReadiness"
  message: "State the genre or musical style."
- id: "styles-only"
  type: "forbidRegex"
  value: "(?:^|[\\n.;]\\s*)(?:lyrics|sözler|styles?|stil|verse|chorus|nakarat)\\s*\\d*\\s*:|\\n\\s*\\S"
  flags: "iu"
  criterion: "toolReadiness"
  message: "\"prompt\" is the Styles field: one line of comma-separated descriptors, no labels and no lyrics. Put the lyrics into the \"Lyrics\" setting."
---

## Sözdizimi

Kaynak: Suno Create ekranı (Advanced modu), Ferit'in gözlemi (2026-10-16); "Music Glossary for Suno" (Suno Help Center).

- İki ayrı metin alanı var: **Styles** ve **Lyrics**.
- Styles alanının örneği: `rock fusion, dangdut traditional, industrial noise, soaring vocals, minor melody`. Virgülle ayrılmış kısa tanımlar.
- Lyrics alanı: "Start writing lyrics, or leave this empty for instrumental". Enstrümantal parçada boş bırakılır.
- More Options: Vocal Gender (Male/Female), Duration (Custom/Auto), Max Mode, Weirdness, Style Influence.
- Glossary önerileri: tempo terimini türle birleştir ("upbeat allegro pop"), dinamikle duyguyu yönlendir ("crescendo into powerful chorus"), çalgı dokusunu belirt ("sparse piano and vocals"), yapıyı tarif et ("verse-chorus-verse with extended bridge"), prodüksiyon efekti ekle ("reverb-heavy ambient soundscape"), türleri harmanla ("jazz-influenced hip-hop with soulful vocals").
- Sözlerdeki bölüm etiketlerinin yazımı (ör. köşeli parantez) ve karakter sınırları KAYNAK GEREKLİ: bu rehberde kullanılmaz.

## Şablon

RouteAI iskeleti. `prompt` Styles alanıdır: tek satırda, virgülle ayrılmış kısa İngilizce tanımlar. Sıra: tür, duygu ve tempo, öne çıkan çalgılar ve doku, vokal tipi, prodüksiyon. Sözler `settings` içinde `Lyrics` anahtarıyla, kullanıcının istediği dilde (belirtmediyse kendi dilinde) yazılır. Kullanıcı söz verdiyse aynen kullanılır. Bölümler boş satırla ayrılır, etiket yazılmaz. Enstrümantal parçada `Lyrics` ayarı olmaz. Vokal kadın ya da erkekse `settings` içine `Vocal Gender: Female` ya da `Male` yazılır.

## Yap / Yapma

Kaynağa dayanan kurallar (yukarıdaki gözlem ve Glossary):

- Styles ve sözler ayrı: promptta "Style:", "Lyrics:" gibi etiket ya da söz satırı olmaz.
- Styles virgülle ayrılmış kısa tanımlardır; tam cümle yazılmaz.
- Enstrümantal parçada söz yazılmaz; Lyrics alanı boş bırakılır.
- Somut müzik terimleri kullanılır: tempo terimi, dinamik, çalgı dokusu, prodüksiyon efekti.

RouteAI kuralları (hedef AI yeterlilik rubriği, lib/promptBuilder/sufficiency.ts):

- Sözlerde bölüm etiketi yazılmaz ("Verse 1:", "Nakarat:"): şarkıda okunabilir; etiket sözdizimi doğrulanmadı.
- Kullanıcının verdiği söz, ad ve tırnaklı metinler aynen korunur.
- Bu araçta negatif prompt alanı yok: negativePrompt boş kalır.

## Örnekler

Biçim örnekleri (içerikleri kopyalanmaz):

- Styles (arayüz örneği): `rock fusion, dangdut traditional, industrial noise, soaring vocals, minor melody`
- Styles (Glossary ipuçlarıyla): `upbeat allegro pop, bright synths and punchy drums, female vocals, crescendo into powerful chorus`
