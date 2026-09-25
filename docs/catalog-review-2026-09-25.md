# Katalog gözden geçirme notları (2026-09-25)

Bu notlar, aktif ürünlere `pricingUrl` eklenirken yapılan web aramalarından çıktı. Fiyat ya da puan yazılmadı; sadece URL eklendi ve aşağıdaki gözlemler not edildi. **Hepsi Ferit'in onayını bekliyor.**

## Yöntem ve sınırı

- Her ürün için ürünün kendi alan adıyla sınırlı bir web araması yapıldı ("<ürün> pricing"). Sadece arama sonucunda ürünün **resmi alan adında** fiyat/plan sayfası olarak görünen URL eklendi.
- Bu ortamın ağ politikası ürün sitelerini doğrudan açmaya izin vermedi. Bu yüzden sayfalar tarayıcıda açılıp okunmadı; URL'ler arama dizininden. Aylık `check-prices` workflow'u her sayfayı gerçekten çeker. Açılmayan sayfa raporda "Hata" olarak görünür.
- `data/products.json`'daki `pricing` alanlarına dokunulmadı. Fiyatlar `check-prices` PR'ı ile gelir.

## Eklenen fiyat sayfaları (46)

`data/products.json` → `pricingUrl`. Tam liste için: `git diff data/products.json`, ya da `data/price-report.md` → "Hata (46)" bölümü. Bu listedekilerin hepsinde URL var, sadece OpenAI anahtarı olmadığı için fiyat çıkarılmadı.

Ürün sitesinden farklı alan adında olanlar (yönlendirme ya da marka değişikliği olabilir):

| Ürün | `url` | `pricingUrl` |
| --- | --- | --- |
| Suno AI | https://suno.ai | https://suno.com/pricing |
| OpusClip | https://opusclip.com | https://www.opus.pro/pricing |
| Fathom | https://www.fathom.video | https://www.fathom.ai/pricing |
| Base44 | https://www.base44.ai | https://base44.com/pricing |
| Midjourney v7 | https://www.midjourney.com | https://docs.midjourney.com/… (plan karşılaştırma sayfası) |
| Kling AI 2.1 | https://klingai.com | https://app.klingai.com/global/membership/membership-plan (uygulama içi sayfa; giriş isteyebilir) |
| Luma Dream Machine | https://lumalabs.ai | https://lumalabs.ai/learning-hub/pricing (yardım merkezi sayfası) |

## Fiyat sayfası bulunamayanlar (10), karar Ferit'te

| Ürün | Neden |
| --- | --- |
| `dall-e-3` | Ayrı bir abonelik sayfası yok. ChatGPT planları içinde mi, API fiyatı mı gösterilmeli? |
| `google-imagen-4` | Gemini aboneliği mi, Vertex AI fiyatı mı? Ürün sayfası bir model sayfası. |
| `google-veo-3` | Aynı durum: Gemini (Google AI Pro/Ultra) mı, Vertex AI mı? |
| `sora-2-openai` | Resmi kaynak: ChatGPT Plus/Pro'ya dahil ([Sora faturalama SSS](https://help.openai.com/en/articles/10245774)). Ayrı fiyat sayfası yok. |
| `openai-atlas-ai-browser` | Ayrı fiyatı yok, ChatGPT planlarına dahil. Ayrıca aşağıdaki **kapanma** notuna bak. |
| `stable-diffusion-xl` | Açık model; "free" olarak kayıtlı. Lisans sayfası mı gösterilmeli? |
| `flux1-pro` | Ürün URL'i `flux-ai.io`. Bu, Black Forest Labs'in resmi sitesi olmayabilir; **ürün URL'ini kontrol et.** |
| `runway-gen-3` | Aramada sadece yardım merkezi plan sayfaları çıktı ([Which plan is right for me?](https://help.runwayml.com/hc/en-us/articles/21664961171475-Which-plan-is-right-for-me)); resmi fiyat sayfası URL'i teyit edilemedi. |
| `adcreativeai` | Aramada fiyat sayfası çıkmadı. |
| `tome` | Aramada fiyat sayfası yok; tome.app'te sadece blog/şablon sayfaları çıktı. **Ürün hâlâ sunum aracı olarak sunuluyor mu, kontrol et.** |

## Aramalarda görülen katalog sorunları

Bunlar resmi sayfaların arama özetlerinden. Katalog değiştirilmedi; ürün adı, URL ve durum kararı Ferit'te.

- **ÖNCELİKLİ — OpenAI Atlas:** OpenAI yardım merkezi Atlas'ın 9 Ağustos 2026'da çalışmayı durduracağını, yeteneklerinin ChatGPT ve Codex'e taşındığını söylüyor ([kaynak](https://help.openai.com/en/articles/20001371-evolving-atlas-into-chatgpt-for-browser-based-agentic-work)). Ürün hâlâ `active`. Sayfayı açıp doğrula; doğruysa `status: retired` yap.
- **Microsoft Copilot Pro:** Microsoft fiyat sayfaları Copilot Pro'nun **Microsoft 365 Premium**'a geçtiğini söylüyor ([kaynak](https://www.microsoft.com/en-us/store/b/copilotpro)).
- **Le Chat (Mistral):** Mistral sitesi "Le Chat is now Vibe" diyor ([kaynak](https://mistral.ai/products/vibe/)).
- **Windsurf:** Fiyat sayfasının başlığı "Plans and Pricing | Devin" ([kaynak](https://windsurf.com/pricing)). Marka değişmiş olabilir.
- **Luma Dream Machine:** Luma'nın sayfaları Dream Machine'in yerini Ray modelleri ve Luma Agents'ın aldığını söylüyor ([kaynak](https://lumalabs.ai/learning-hub/pricing)).
- **Runway:** "Unlimited" planı "Max" planına geçiyor ([kaynak](https://help.runwayml.com/hc/en-us/articles/52068047744019-Unlimited-plan-is-switching-to-Max)).
- **Sürümlü ürün adları** (ör. "Gemini 2.5 Pro", "Claude AI (Claude 4)", "ChatGPT (GPT-5)", "Grok 4.1") eskimiş olabilir. Resmi sayfalar daha yeni model adlarından söz ediyor. Model bilgisi gece senkronuyla `data/models.json`'a gelince ürün adları gözden geçirilmeli.
