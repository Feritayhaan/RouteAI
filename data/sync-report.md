# Model senkron raporu

Durum: data/models.json güncellendi

## Karar: başarılı

- Artificial Analysis: anahtar tanımlı değil, atlandı (hata sayılmadı).
- Kısmi hata: 1 hata; beklenen kaynakların hepsinden veri geldi.
- Tazelenemeyen arena (6): lmarena:text, lmarena:text/creative_writing, lmarena:text/longer_query, lmarena:text/instruction_following, lmarena:text/non_english, lmarena:text/multi_turn — eski skorları korundu, güncellenmedi.

## Kaynaklar

- Artificial Analysis: başarısız / atlandı — eski veri korundu
- LMArena: 2026-10-23
- Artificial Analysis: AA_API_KEY yok, atlandı (eski veri korunur)

Toplam model: 653 (Artificial Analysis: 0, LMArena: 653, iki kaynakta: 0)

## Hatalar

- LMArena text offset=3000: HTTP 429

## Tazelenemeyen arenalar (eski skorlar korundu)

- lmarena:text: bu koşuda alınamadı; eski skorlar eski tarihiyle kaldı (bayatlar).
- lmarena:text/creative_writing: bu koşuda alınamadı; eski skorlar eski tarihiyle kaldı (bayatlar).
- lmarena:text/longer_query: bu koşuda alınamadı; eski skorlar eski tarihiyle kaldı (bayatlar).
- lmarena:text/instruction_following: bu koşuda alınamadı; eski skorlar eski tarihiyle kaldı (bayatlar).
- lmarena:text/non_english: bu koşuda alınamadı; eski skorlar eski tarihiyle kaldı (bayatlar).
- lmarena:text/multi_turn: bu koşuda alınamadı; eski skorlar eski tarihiyle kaldı (bayatlar).

## Yeni modeller

1: spark-x2-6

## Kaybolan modeller

- yok

## Olası eşleşmeler (alias adayı — data/model-aliases.json'a sadece eminsen ekle)

- yok

## Uyarılar

- gpt-5-3-codex-codex-harness: lmarena:webdev iki kez geldi (1406.5840597819574 / 1370.6369966607529); yüksek olan tutuldu

## Alan eşlemesi (doğrula)

- LMArena webdev: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena webdev: kategori 'overall' (149/643 satır)
- LMArena search: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena search: kategori 'overall' (42/42 satır)
- LMArena document: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena document: kategori 'overall' (44/44 satır)
- LMArena text_to_image: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena text_to_image: kategori 'overall' (82/680 satır)
- LMArena text_to_image/text_rendering: kategori 'text_rendering' (82/82 satır)
- LMArena text_to_image/commercial_design: kategori 'commercial_design' (82/82 satır)
- LMArena text_to_image/photorealistic: kategori 'photorealistic' (82/82 satır)
- LMArena image_edit: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena image_edit: kategori 'overall' (60/105 satır)
- LMArena text_to_video: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena text_to_video: kategori 'overall' (48/48 satır)
- LMArena image_to_video: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena image_to_video: kategori 'overall' (48/48 satır)
- LMArena video_edit: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena video_edit: kategori 'overall' (10/10 satır)

## LMArena kategorileri (kaynakta görülenler)

- webdev: 5 kategori — image_to_webdev (64), overall (149), webdev (149), webdev-html (148), webdev-react (133)
- search: 1 kategori — overall (42)
- document: 1 kategori — overall (44)
- text_to_image: 11 kategori — 3d_modeling (82), art (82), cartoon (82), chinese (8), commercial_design (82), english (8), overall (82), photorealistic (82), portraits (82), russian (8), text_rendering (82)
- image_edit: 2 kategori — multi_image_edit (45), overall (60)
- text_to_video: 1 kategori — overall (48)
- image_to_video: 1 kategori — overall (48)
- video_edit: 1 kategori — overall (10)

## Yanıtlarda görülen alanlar

- LMArena configs: agent/latest, agent/full, agent_bash_recovery_steps/latest, agent_bash_recovery_steps/full, agent_bash_reliability/latest, agent_bash_reliability/full, agent_bash_reliability_no_prereq/latest, agent_bash_reliability_no_prereq/full, agent_praise_complaint/latest, agent_praise_complaint/full, agent_steerability/latest, agent_steerability/full, agent_task_outcome_explicit/latest, agent_task_outcome_explicit/full, agent_tool_hallucination/latest, agent_tool_hallucination/full, document/latest, document/full, document_style_control/latest, document_style_control/full, image_edit/latest, image_edit/full, image_to_video/latest, image_to_video/full, search/latest, search/full, search_factuality/latest, search_factuality/full, search_style_control/latest, search_style_control/full, text/latest, text/full, text_factuality/latest, text_factuality/full, text_style_control/latest, text_style_control/full, text_to_image/latest, text_to_image/full, text_to_video/latest, text_to_video/full, video_edit/latest, video_edit/full, vision/latest, vision/full, vision_style_control/latest, vision_style_control/full, webdev/latest, webdev/full
- LMArena webdev: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
- LMArena search: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
- LMArena document: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
- LMArena text_to_image: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
- LMArena image_edit: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
- LMArena text_to_video: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
- LMArena image_to_video: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
- LMArena video_edit: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date

Kaynak ve lisans: skorlar Artificial Analysis (artificialanalysis.ai) ve LMArena (lmarena.ai) verisidir; gösterilirken kaynak adı görünür olmalı.

## Ürün → güncel model (otomatik)

| Ürün | Güncel model | Çıkış | Kaynak |
| --- | --- | --- | --- |
| Midjourney | (eşleşen model yok) | — | — |
| ChatGPT (görsel) | gpt-image-2.5-sunburst | — | lmarena, 2026-10-21 |
| DALL-E (OpenAI) | dall-e-3 | — | lmarena, 2026-10-19 |
| Adobe Firefly | (eşleşen model yok) | — | — |
| Stable Diffusion | stable-diffusion-v35-large | — | lmarena, 2026-10-19 |
| FLUX (Black Forest Labs) | flux-2-max | — | lmarena, 2026-10-21 |
| Leonardo AI | lucid-origin | — | lmarena, 2026-10-19 |
| Ideogram | ideogram-4.0-quality | — | lmarena, 2026-10-19 |
| ChatGPT | gpt-5.6-sol-xhigh | — | lmarena, 2026-10-23 |
| Claude | claude-opus-5-high | — | lmarena, 2026-10-23 |
| Gemini | gemini-4-argon-high | — | lmarena, 2026-10-23 |
| Claude Code (Anthropic) | claude-opus-5-high | — | lmarena, 2026-10-23 |
| ElevenLabs | (eşleşen model yok) | — | — |
| Murf.ai | (eşleşen model yok) | — | — |
| Google Veo | veo-3.1-audio | — | lmarena, 2026-10-23 |
| Perplexity AI | ppl-sonar-reasoning-pro-high | — | lmarena, 2026-10-23 |
| Runway | runway-gen4-aleph | — | lmarena, 2026-10-19 |
| Pika Labs | pika-v2.2 | — | lmarena, 2026-10-23 |
| Grok | grok-4.5 | — | lmarena, 2026-10-23 |
| Kling AI | kling-o3-pro | — | lmarena, 2026-10-19 |
| Luma Dream Machine | ray-3 | — | lmarena, 2026-10-23 |
| Gemini (görsel) | gemini-nano-banana-2.1 | — | lmarena, 2026-10-21 |
| Le Chat (Mistral) | mistral-large-4 | — | lmarena, 2026-10-23 |
| Grok Imagine (xAI) | grok-imagine-video-1.5-agent | — | lmarena, 2026-10-19 |
