---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "music.generate" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-music-generate"
version: 1
appliesTo: []
tasks: ["music.generate"]
modality: "music"
promptLanguage: "user"
sources: ["https://help.suno.com/en/articles/5782849", "https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "kind"
  impact: "high"
  question:
    en: "What do you need?"
    tr: "Ne istiyorsun?"
  options:
  - id: "song"
    label:
      en: "A song with vocals"
      tr: "Sözlü şarkı"
    value: "a song with vocals and lyrics"
  - id: "instrumental"
    label:
      en: "Instrumental"
      tr: "Sözsüz müzik"
    value: "an instrumental track with no vocals"
  - id: "jingle"
    label:
      en: "Short jingle"
      tr: "Kısa jingle"
    value: "a short jingle"
  - id: "background"
    label:
      en: "Background music"
      tr: "Fon müziği"
    value: "background music that does not distract from speech"
  - id: "intro"
    label:
      en: "Intro or theme"
      tr: "Giriş / tema müziği"
    value: "an intro or theme track"
  - id: "loop"
    label:
      en: "Loopable track"
      tr: "Döngüye uygun parça"
    value: "a track that loops smoothly"
  default: "infer"
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
  - id: "electronic"
    label:
      en: "Electronic"
      tr: "Elektronik"
    value: "electronic"
  - id: "hiphop"
    label:
      en: "Hip-hop"
      tr: "Hip-hop"
    value: "hip-hop"
  - id: "acoustic"
    label:
      en: "Acoustic / folk"
      tr: "Akustik / halk"
    value: "acoustic folk"
  - id: "cinematic"
    label:
      en: "Cinematic / orchestral"
      tr: "Sinematik / orkestra"
    value: "cinematic orchestral"
  - id: "lofi"
    label:
      en: "Lo-fi / chill"
      tr: "Lo-fi / sakin"
    value: "lo-fi chill"
  - id: "jazz"
    label:
      en: "Jazz"
      tr: "Caz"
    value: "jazz"
  default: "infer"
- id: "mood"
  impact: "high"
  question:
    en: "Which mood?"
    tr: "Nasıl bir hava?"
  options:
  - id: "happy"
    label:
      en: "Happy, upbeat"
      tr: "Neşeli, hareketli"
    value: "happy and upbeat"
  - id: "calm"
    label:
      en: "Calm, relaxed"
      tr: "Sakin, rahat"
    value: "calm and relaxed"
  - id: "emotional"
    label:
      en: "Emotional, tender"
      tr: "Duygusal"
    value: "emotional and tender"
  - id: "epic"
    label:
      en: "Epic, powerful"
      tr: "Epik, güçlü"
    value: "epic and powerful"
  - id: "dark"
    label:
      en: "Dark, tense"
      tr: "Karanlık, gergin"
    value: "dark and tense"
  - id: "nostalgic"
    label:
      en: "Nostalgic"
      tr: "Nostaljik"
    value: "nostalgic"
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
      en: "Mid-tempo"
      tr: "Orta"
    value: "mid-tempo"
  - id: "fast"
    label:
      en: "Fast"
      tr: "Hızlı"
    value: "fast tempo"
  default: "mid"
- id: "vocals"
  impact: "medium"
  question:
    en: "Vocals?"
    tr: "Vokal?"
  options:
  - id: "female"
    label:
      en: "Female voice"
      tr: "Kadın sesi"
    value: "a female lead voice"
  - id: "male"
    label:
      en: "Male voice"
      tr: "Erkek sesi"
    value: "a male lead voice"
  - id: "choir"
    label:
      en: "Group / choir"
      tr: "Koro / grup"
    value: "group vocals or choir"
  - id: "none"
    label:
      en: "No vocals"
      tr: "Vokal yok"
    value: "no vocals"
  default: "none"
- id: "instruments"
  impact: "medium"
  question:
    en: "Main instruments?"
    tr: "Ana enstrümanlar?"
  options:
  - id: "piano"
    label:
      en: "Piano"
      tr: "Piyano"
    value: "piano"
  - id: "guitar"
    label:
      en: "Guitar"
      tr: "Gitar"
    value: "guitar"
  - id: "synth"
    label:
      en: "Synths"
      tr: "Sentezleyici"
    value: "synthesizers"
  - id: "strings"
    label:
      en: "Strings"
      tr: "Yaylılar"
    value: "strings"
  - id: "drums"
    label:
      en: "Drums and bass"
      tr: "Davul ve bas"
    value: "drums and bass"
  default: "infer"
- id: "structure"
  impact: "medium"
  question:
    en: "Structure?"
    tr: "Yapı?"
  options:
  - id: "verse-chorus"
    label:
      en: "Verses and chorus"
      tr: "Kıta ve nakarat"
    value: "verses and a chorus"
  - id: "build"
    label:
      en: "Intro, build, peak, fade"
      tr: "Giriş, yükseliş, zirve, bitiş"
    value: "a gradual build to a peak, then a clean ending"
  - id: "loop"
    label:
      en: "Steady loop"
      tr: "Sabit döngü"
    value: "a steady repeating pattern with little change"
  default: "verse-chorus"
- id: "lyrics"
  impact: "medium"
  question:
    en: "Lyrics?"
    tr: "Söz?"
  options:
  - id: "theme"
    label:
      en: "Write lyrics on my theme"
      tr: "Konuma göre söz yaz"
    value: "write original lyrics on the theme the user gave"
  - id: "mine"
    label:
      en: "Use my lyrics"
      tr: "Benim sözlerimi kullan"
    value: "use the lyrics the user provided exactly"
  - id: "none"
    label:
      en: "No lyrics"
      tr: "Söz yok"
    value: "no lyrics"
  default: "none"
refinements:
- id: "slower"
  label:
    en: "Slower"
    tr: "Daha yavaş"
  patch:
    tempo: "slow tempo"
- id: "faster"
  label:
    en: "Faster"
    tr: "Daha hızlı"
  patch:
    tempo: "fast tempo"
- id: "instrumental"
  label:
    en: "No vocals"
    tr: "Vokalsiz"
  patch:
    vocals: "no vocals"
- id: "calm"
  label:
    en: "Calmer"
    tr: "Daha sakin"
  patch:
    mood: "calm and relaxed"
- id: "epic"
  label:
    en: "More epic"
    tr: "Daha epik"
  patch:
    mood: "epic and powerful"
- id: "piano"
  label:
    en: "Piano-led"
    tr: "Piyano ağırlıklı"
  patch:
    instruments: "piano"
- id: "lyrics"
  label:
    en: "Add lyrics"
    tr: "Söz ekle"
  patch:
    lyrics: "write original lyrics on the theme the user gave"
- id: "simpler"
  label:
    en: "Simpler arrangement"
    tr: "Daha sade düzenleme"
  instruction: "Use fewer instruments and a simpler arrangement."
checklist: ["Genre and mood", "Tempo feel", "Instruments or vocals stated", "Structure stated", "Style described in words, no artist names", "Original lyrics only, or the user's own", "No copyrighted lyrics or melodies", "Style text kept short"]
validators:
- id: "length"
  type: "maxLength"
  value: 1800
  message: "RouteAI limit: keep the prompt under 1800 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{30,}$"
  message: "Too short: name the genre, the mood and the main instruments."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Müzik üretim araçları (Suno, Udio, Stable Audio, ElevenLabs Music vb.) iki girdi ister: **stil tarifi** (tür, hava, tempo, enstrüman, vokal) ve (şarkıysa) **söz**. Araçların etiket ve sözdizimi birbirinden farklıdır; bu yüzden bu görev düz, geniş uyumlu bir tarif yazar ve hiçbir araca özel işaret kullanmaz.

**Sıra:** (1) tür ve alt tür, (2) hava, (3) tempo hissi, (4) enstrümanlar ve vokal, (5) yapı, (6) (varsa) söz.

- **Stil metnini kısa tut:** birkaç somut kelime ("upbeat indie pop, warm acoustic guitar, light drums, female vocal") yüzlerce kelimelik anlatımdan iyidir. Birbiriyle çelişen türleri (ör. ağır metal + lullaby) karıştırma.
- **Sanatçı, grup ya da şarkı adı yazma;** "tarzında" demek yerine türü ve duyguyu tarif et. Telifli söz ya da melodi isteme.
- Söz: kullanıcı verdiyse AYNEN kullan, değiştirme; vermediyse konusuna göre özgün söz yaz. Kıta/nakarat ayrımını boş satırla göster; araç özel bölüm etiketlerini (ör. [Verse]) destekliyorsa kullanıcı bilir — bilmiyorsan etiket uydurma, düz bölümlendir.
- Sözlü şarkıda söz dili, kullanıcının istediği şarkı dilidir; stil kelimeleri aracın daha iyi anladığı dilde olabilir, bunu uydurma kural gibi sunma.
- Fon müziği ve jingle için konuşmayı bastırmayacak sade düzenleme iste; döngü için "sabit yapı, az değişim" yaz.
- Süre ve model sürümü çoğu araçta ayardan seçilir; kesin süre/sınır rakamı uydurma.

## Şablon

Stil: [tür], [hava], [tempo], [enstrümanlar], [vokal]. Yapı: [yapı]. [Söz: kullanıcının sözleri / konuya göre özgün söz / söz yok]. Kurallar: sanatçı ya da şarkı adı yazma; telifli söz yazma; stil tarifini kısa ve somut tut.

## Yap / Yapma

**Yap**
- Tür, hava, tempo ve enstrümanı somut söyle.
- Stil tarifini kısa tut.
- Sözleri boş satırla bölümle.
- Fon müziğinde sade düzenleme iste.

**Yapma**
- Sanatçı, grup ya da şarkı adı yazma.
- Telifli söz ya da melodi isteme.
- Çelişen türleri tek promptta karıştırma.
- Aracın bilinmeyen etiketlerini uydurma.

## Örnekler

**Örnek 1 — sözlü şarkı:** "Doğum günü için neşeli bir şarkı"

```
Stil: upbeat indie pop, happy and warm, mid-tempo, acoustic guitar and light drums, female lead voice. Yapı: kıta ve nakarat. Söz: arkadaşım Ayşe'nin doğum günü için, Türkçe, özgün ve neşeli sözler yaz; nakarat kısa ve akılda kalıcı olsun. Kurallar: sanatçı ya da şarkı adı yazma; telifli söz yazma.
```

**Örnek 2 — fon müziği:** "Kurs videoları için sakin arka plan müziği"

```
Stil: calm lo-fi, relaxed, slow tempo, soft piano and gentle beat, no vocals. Yapı: sabit döngü, az değişim; konuşmayı bastırmayacak sade düzenleme. Söz yok. Sanatçı ya da şarkı adı yazma.
```

Örnekler Türkçe açıklandı; İngilizce yazılacak promptlar örneklerde İngilizce gösterilir.
