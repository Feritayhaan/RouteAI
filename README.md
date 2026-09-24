# 🚀 RouteAI — Yapay Zeka Navigatörün

RouteAI, kullanıcının ne yapmak istediğini doğal dille yazması üzerine en uygun AI aracını veya adım adım iş akışını (workflow) öneren akıllı bir navigasyon platformudur. OpenAI GPT-4o-mini destekli niyet analizi, Upstash vektör veritabanı tabanlı semantik arama ve 80+ araçlık zengin bir veritabanı ile çalışır.

---

## 🏗️ Mimari Özet

```
Kullanıcı Sorgusu
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  1. Niyet Analizi (Intent Parsing)                   │
│     • OpenAI GPT-4o-mini ile JSON Structured Output  │
│     • Keyword fallback mekanizması                   │
│     • Karmaşıklık tespiti (simple / multi-step)      │
│     • Upstash KV ile intent caching                  │
└───────────────┬──────────────────┬───────────────────┘
                │                  │
        ┌───────▼──────┐   ┌──────▼───────┐
        │  Simple      │   │  Multi-step  │
        │  (Tek araç)  │   │  (Workflow)  │
        └───────┬──────┘   └──────┬───────┘
                │                  │
                ▼                  ▼
┌───────────────────────┐  ┌─────────────────────────┐
│ 2. Vektör Arama       │  │ 3. Workflow Generator    │
│    Upstash Vector DB  │  │    Template matching     │
│    text-embedding-3   │  │    Adım adım araç eşle  │
│    Keyword fallback   │  │    Prompt önerileri      │
└───────────┬───────────┘  └────────────┬────────────┘
            │                           │
            ▼                           ▼
┌───────────────────────────────────────────────────────┐
│  4. Streaming NDJSON Response                         │
│     • Chunk 1: Ana araç önerisi (anında)              │
│     • Chunk 2: Alternatifler                          │
│     • Chunk 3: Debug bilgisi (dev only)               │
└───────────────────────────────────────────────────────┘
```

## ⚙️ Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TailwindCSS 3 |
| Backend | Next.js API Routes (Edge-ready) |
| AI | OpenAI GPT-4o-mini, text-embedding-3-small |
| Vektör DB | Upstash Vector |
| KV / Cache | Upstash Redis (@vercel/kv) |
| Validasyon | Zod |
| Tema | next-themes (light/dark) |
| Analytics | Vercel Analytics |

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler

- Node.js 18+
- npm veya yarn
- OpenAI API anahtarı
- Upstash Vector + KV hesabı

### Kurulum

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.local.example .env.local   # veya mevcut .env.local dosyasını düzenle

# 3. Geliştirme sunucusunu başlat
npm run dev

# 4. (İlk kurulumda) Araçları KV'ye yaz (VECTOR_SEARCH_ENABLED=true ise vektör indeksini de doldurur)
curl -X POST -H "x-admin-key: YOUR_ADMIN_SECRET" http://localhost:3000/api/admin/seed
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresine git.

---

## 🔑 Environment Variables

`.env.local` dosyasında aşağıdaki değişkenleri tanımla:

| Değişken | Açıklama | Zorunlu |
|----------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API anahtarı (GPT-4o-mini + embeddings) | ✅ |
| `UPSTASH_VECTOR_REST_URL` | Upstash Vector veritabanı URL'i | ✅ |
| `UPSTASH_VECTOR_REST_TOKEN` | Upstash Vector erişim tokeni | ✅ |
| `KV_REST_API_URL` | Upstash Redis REST API URL'i | ✅ |
| `KV_REST_API_TOKEN` | Upstash Redis erişim tokeni | ✅ |
| `KV_REST_API_READ_ONLY_TOKEN` | Upstash Redis salt-okunur token | ✅ |
| `KV_URL` | Redis bağlantı URL'i (rediss://) | ✅ |
| `REDIS_URL` | Redis bağlantı URL'i (alternatif) | ⬜ |
| `ADMIN_SECRET` | Admin endpoint'leri için gizli anahtar | ✅ |
| `NEXT_PUBLIC_BASE_URL` | Uygulama base URL'i | ⬜ |
| `VECTOR_SEARCH_ENABLED` | `true` ise Upstash Vector araması açılır; boş/tanımsız = kapalı (anahtar kelime araması). `UPSTASH_VECTOR_*` sadece bu açıkken kullanılır | ⬜ |
| `OPENAI_MODEL` | v2 sohbet ajanının OpenAI modeli (P5'te devreye girer; şu an kullanılmıyor) | ⬜ |
| `AA_API_KEY` | Artificial Analysis API anahtarı, gece model senkronu için (P3'te devreye girer; şu an kullanılmıyor) | ⬜ |

Değerleri boş bir şablon: [`.env.local.example`](.env.local.example).

---

## 📡 API Endpoint Dokümantasyonu

### `POST /api/recommend`

Kullanıcının doğal dil sorgusunu analiz ederek uygun AI aracı veya workflow önerir.

**Request Body:**
```json
{
  "prompt": "Çizgi roman oluşturmak istiyorum",
  "pricingFilter": "all"  // Opsiyonel: "all" | "free" | "paid"
}
```

**Response (Streaming NDJSON):**
```
Content-Type: application/x-ndjson

// Chunk 1 - Ana öneri
{"chunk":"main","type":"simple","category":"gorsel","main":{"toolName":"Midjourney v7","description":"...","url":"...","pricing":{...},"strength":9.8,"why":"..."}}

// Chunk 2 - Alternatifler
{"chunk":"alternatives","alternatives":[{"toolName":"DALL-E 3","description":"...","url":"...","pricing":{...},"strength":9.5}]}
```

**Workflow Response (tek seferlik JSON):**
```json
{
  "type": "workflow",
  "category": "gorsel",
  "workflow": {
    "name": "Çizgi Roman Oluşturma",
    "totalSteps": 5,
    "estimatedDuration": "3-5 saat",
    "steps": [...]
  }
}
```

**Hata Durumları:**
| Status | Açıklama |
|--------|----------|
| `200` | Başarılı veya LOW_CONFIDENCE (önerilerle) |
| `400` | Validasyon hatası veya parse hatası |
| `429` | Rate limit aşıldı |
| `500` | Sunucu hatası |

---

> Admin uçları anahtarı **yalnızca** `x-admin-key` başlığından okur; `?key=` sorgu parametresi desteklenmez (URL'deki sır loglara ve tarayıcı geçmişine sızar).

### `GET /api/update-tools`

Mevcut araç sayısını ve kategori dağılımını döndürür.

**Headers:** `x-admin-key: YOUR_ADMIN_SECRET`

### `POST /api/update-tools`

Şimdilik `501 Not Implemented` döner; araç keşfi P8'de aday ürün akışıyla gelecek.

**Headers:** `x-admin-key: YOUR_ADMIN_SECRET`

### `POST /api/admin/seed`

`lib/tools-database.json`'daki araçları KV'ye yazar; `VECTOR_SEARCH_ENABLED=true` ise vektör indeksini sıfırlayıp embedding'lerle yeniden doldurur. Yıkıcı bir iş olduğu için yalnızca POST ile çalışır. İlk kurulumda veya veritabanı sıfırlandığında çalıştırılmalıdır.

**Headers:** `x-admin-key: YOUR_ADMIN_SECRET`

### `GET /api/admin/feedback`

Son 100 geri bildirim kaydını döndürür.

**Headers:** `x-admin-key: YOUR_ADMIN_SECRET`

---

## 📂 Proje Yapısı

```
RouteAI/
├── app/
│   ├── api/
│   │   ├── recommend/route.ts    # Ana öneri API'si (streaming)
│   │   ├── update-tools/route.ts # Araç güncelleme
│   │   └── admin/seed/route.ts   # Veritabanı seed
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Ana sayfa
│   └── globals.css               # Tailwind + tema
├── components/
│   ├── HomeClient.tsx            # Ana istemci bileşeni
│   ├── WorkflowDisplay.tsx       # Workflow gösterimi
│   ├── SimpleRecommendationDisplay.tsx
│   └── ui/                       # Temel UI bileşenleri
├── lib/
│   ├── intent/                   # Niyet analizi modülü
│   │   ├── parser.ts             # OpenAI + keyword fallback
│   │   ├── cache.ts              # KV tabanlı intent cache
│   │   └── types.ts              # ParsedIntent, IntentParsingError
│   ├── workflow/                 # Workflow motoru
│   │   ├── workflowGenerator.ts  # Workflow oluşturucu
│   │   ├── workflowTemplates.ts  # 20+ önceden tanımlı şablon
│   │   └── workflowTypes.ts      # Tip tanımları
│   ├── tools-database.json       # 80+ AI araç veritabanı
│   ├── toolsService.ts           # 3 katmanlı cache + CRUD
│   ├── vectorService.ts          # Upstash Vector arama
│   ├── rateLimit.ts              # Sliding window rate limiter
│   └── openai.ts                 # OpenAI client
└── types/
    └── shims.d.ts                # Tip shim'leri
```

---

## 🤝 Katkı Rehberi

1. Bu repo'yu fork'la
2. Feature branch oluştur: `git checkout -b feature/yeni-ozellik`
3. Değişikliklerini commit'le: `git commit -m 'feat: yeni özellik ekle'`
4. Branch'ini push'la: `git push origin feature/yeni-ozellik`
5. Pull Request aç

### Geliştirme Kuralları

- TypeScript strict mode kullan
- Her API değişikliğinde Zod şemasını güncelle
- Yeni araç eklerken `tools-database.json` formatına uy
- Commit mesajlarında [Conventional Commits](https://www.conventionalcommits.org/) kullan

### Test

```bash
npm run test
npm run lint
npm run eval -- --recommender=v1   # altın set (evals/golden.jsonl); sonuç evals/results/'a yazılır
```

---

## 📄 Lisans

Bu proje özel lisans altındadır. Ticari kullanım için iletişime geçin.
