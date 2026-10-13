# Model senkron raporu

Durum: data/models.json güncellendi

## Karar: başarılı

- Artificial Analysis: anahtar tanımlı değil, atlandı (hata sayılmadı).
- Kısmi hata: 1 hata; beklenen kaynakların hepsinden veri geldi.

## Kaynaklar

- Artificial Analysis: başarısız / atlandı — eski veri korundu
- LMArena: 2026-10-13
- Artificial Analysis: AA_API_KEY yok, atlandı (eski veri korunur)

Toplam model: 621 (Artificial Analysis: 0, LMArena: 621, iki kaynakta: 0)

## Hatalar

- LMArena image_to_video offset=0: HTTP 429

## Yeni modeller

- yok

## Kaybolan modeller

flux-3-video-20260811, grok-imagine-video-1-5-720p, grok-imagine-video-480p, hailuo-02-fast, hidream-o1-video-1-0, kling-v2-1-standard, kling-v3-pro, runway-gen4-turbo, vidu-q2-pro, vidu-q2-turbo, vidu-q3-pro, wan2-5-i2v-preview, wan2-6-i2v, wan2-7-i2v

## Olası eşleşmeler (alias adayı — data/model-aliases.json'a sadece eminsen ekle)

- yok

## Uyarılar

- gpt-5-3-codex-codex-harness: lmarena:webdev iki kez geldi (1408.6005875043013 / 1371.4188946798915); yüksek olan tutuldu

## Alan eşlemesi (doğrula)

- LMArena text: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena text: kategori 'overall' (414/10974 satır)
- LMArena webdev: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena webdev: kategori 'overall' (141/610 satır)
- LMArena search: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena search: kategori 'overall' (34/34 satır)
- LMArena document: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena document: kategori 'overall' (44/44 satır)
- LMArena text_to_image: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena text_to_image: kategori 'overall' (82/680 satır)
- LMArena image_edit: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena image_edit: kategori 'overall' (59/103 satır)
- LMArena text_to_video: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena text_to_video: kategori 'overall' (48/48 satır)
- LMArena video_edit: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena video_edit: kategori 'overall' (10/10 satır)

## Yanıtlarda görülen alanlar

- LMArena configs: agent/latest, agent/full, agent_bash_recovery_steps/latest, agent_bash_recovery_steps/full, agent_bash_reliability_no_prereq/latest, agent_bash_reliability_no_prereq/full, agent_praise_complaint/latest, agent_praise_complaint/full, agent_steerability/latest, agent_steerability/full, agent_task_outcome_explicit/latest, agent_task_outcome_explicit/full, agent_tool_hallucination/latest, agent_tool_hallucination/full, document/latest, document/full, document_style_control/latest, document_style_control/full, image_edit/latest, image_edit/full, image_to_video/latest, image_to_video/full, search/latest, search/full, search_factuality/latest, search_factuality/full, search_style_control/latest, search_style_control/full, text/latest, text/full, text_factuality/latest, text_factuality/full, text_style_control/latest, text_style_control/full, text_to_image/latest, text_to_image/full, text_to_video/latest, text_to_video/full, video_edit/latest, video_edit/full, vision/latest, vision/full, vision_style_control/latest, vision_style_control/full, webdev/latest, webdev/full
- LMArena text: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
- LMArena webdev: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
- LMArena search: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
- LMArena document: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
- LMArena text_to_image: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
- LMArena image_edit: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
- LMArena text_to_video: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
- LMArena video_edit: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date

Kaynak ve lisans: skorlar Artificial Analysis (artificialanalysis.ai) ve LMArena (lmarena.ai) verisidir; gösterilirken kaynak adı görünür olmalı.

## Ürün → güncel model (otomatik)

| Ürün | Güncel model | Çıkış | Kaynak |
| --- | --- | --- | --- |
| Midjourney | (eşleşen model yok) | — | — |
| ChatGPT (görsel) | gpt-image-2.5-sunburst | — | lmarena, 2026-10-12 |
| DALL-E (OpenAI) | dall-e-3 | — | lmarena, 2026-10-12 |
| Google Imagen | imagen-ultra-4.0-generate-001 | — | lmarena, 2026-10-12 |
| Adobe Firefly | (eşleşen model yok) | — | — |
| Stable Diffusion | stable-diffusion-v35-large | — | lmarena, 2026-10-12 |
| FLUX (Black Forest Labs) | flux-2-max | — | lmarena, 2026-10-12 |
| Leonardo AI | lucid-origin | — | lmarena, 2026-10-12 |
| Ideogram | ideogram-4.0-quality | — | lmarena, 2026-10-12 |
| ChatGPT | gpt-5.6-sol-xhigh | — | lmarena, 2026-10-12 |
| Claude | claude-opus-5-high | — | lmarena, 2026-10-12 |
| Gemini | gemini-4-argon-high | — | lmarena, 2026-10-12 |
| Claude Code (Anthropic) | claude-opus-5-high | — | lmarena, 2026-10-12 |
| ElevenLabs | (eşleşen model yok) | — | — |
| Murf.ai | (eşleşen model yok) | — | — |
| Sora (OpenAI) | sora-2-pro | — | lmarena, 2026-10-12 |
| Google Veo | veo-3.1-audio | — | lmarena, 2026-10-12 |
| Perplexity AI | ppl-sonar-reasoning-pro-high | — | lmarena, 2026-10-12 |
| Runway | runway-gen4-aleph | — | lmarena, 2026-10-12 |
| Pika Labs | pika-v2.2 | — | lmarena, 2026-10-12 |
| Grok | grok-4.5 | — | lmarena, 2026-10-12 |
| Kling AI | kling-o3-pro | — | lmarena, 2026-10-12 |
| Luma Dream Machine | ray-3 | — | lmarena, 2026-10-12 |
| Gemini (görsel) | gemini-nano-banana-2.1 | — | lmarena, 2026-10-12 |
| Le Chat (Mistral) | mistral-large-4 | — | lmarena, 2026-10-12 |
| Grok Imagine (xAI) | grok-imagine-video-1.5-agent | — | lmarena, 2026-10-12 |
