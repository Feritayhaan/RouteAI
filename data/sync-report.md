# Model senkron raporu

Durum: data/models.json güncellendi

## Karar: başarılı

- Artificial Analysis: anahtar tanımlı değil, atlandı (hata sayılmadı).

## Kaynaklar

- Artificial Analysis: başarısız / atlandı — eski veri korundu
- LMArena: 2026-10-16
- Artificial Analysis: AA_API_KEY yok, atlandı (eski veri korunur)

Toplam model: 638 (Artificial Analysis: 0, LMArena: 638, iki kaynakta: 0)

## Hatalar

- yok

## Yeni modeller

17: muse-wonder-max, claude-fable-5-1-high, claude-opus-5-5-medium, hidream-o1-video-1-0, grok-imagine-video-1-5-720p, flux-3-video-20260811, wan2-7-i2v, grok-imagine-video-480p, vidu-q3-pro, kling-v3-pro, wan2-5-i2v-preview, wan2-6-i2v, vidu-q2-turbo, kling-v2-1-standard, vidu-q2-pro, hailuo-02-fast, runway-gen4-turbo

## Kaybolan modeller

- yok

## Olası eşleşmeler (alias adayı — data/model-aliases.json'a sadece eminsen ekle)

- yok

## Uyarılar

- gpt-5-3-codex-codex-harness: lmarena:webdev iki kez geldi (1406.0443767771428 / 1370.9404407394484); yüksek olan tutuldu

## Alan eşlemesi (doğrula)

- LMArena text: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena text: kategori 'overall' (415/11006 satır)
- LMArena webdev: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena webdev: kategori 'overall' (142/614 satır)
- LMArena search: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena search: kategori 'overall' (42/42 satır)
- LMArena document: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena document: kategori 'overall' (44/44 satır)
- LMArena text_to_image: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena text_to_image: kategori 'overall' (82/680 satır)
- LMArena image_edit: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena image_edit: kategori 'overall' (59/103 satır)
- LMArena text_to_video: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena text_to_video: kategori 'overall' (48/48 satır)
- LMArena image_to_video: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena image_to_video: kategori 'overall' (48/48 satır)
- LMArena video_edit: name=model_name, organization=organization, score=rating, ciLow=rating_lower, ciHigh=rating_upper, votes=vote_count, rank=rank, releaseDate=—, category=category
- LMArena video_edit: kategori 'overall' (10/10 satır)

## LMArena kategorileri (kaynakta görülenler)

- text: 29 kategori — chinese (390), coding (410), creative_writing (413), english (415), exclude_ties (415), expert (365), french (297), german (313), hard_prompts (415), hard_prompts_english (413), industry_business_and_management_and_financial_operations (408), industry_entertainment_and_sports_and_media (413), industry_legal_and_government (387), industry_life_and_physical_and_social_science (413), industry_mathematical (397), industry_medicine_and_healthcare (385), industry_software_and_it_services (415), industry_writing_and_literature_and_language (414), instruction_following (415), japanese (280), korean (283), longer_query (393), math (400), multi_turn (413), non_english (415), overall (415), polish (234), russian (379), spanish (301)
- webdev: 5 kategori — image_to_webdev (63), overall (142), webdev (142), webdev-html (141), webdev-react (126)
- search: 1 kategori — overall (42)
- document: 1 kategori — overall (44)
- text_to_image: 11 kategori — 3d_modeling (82), art (82), cartoon (82), chinese (8), commercial_design (82), english (8), overall (82), photorealistic (82), portraits (82), russian (8), text_rendering (82)
- image_edit: 2 kategori — multi_image_edit (44), overall (59)
- text_to_video: 1 kategori — overall (48)
- image_to_video: 1 kategori — overall (48)
- video_edit: 1 kategori — overall (10)

## Yanıtlarda görülen alanlar

- LMArena configs: agent/latest, agent/full, agent_bash_recovery_steps/latest, agent_bash_recovery_steps/full, agent_bash_reliability_no_prereq/latest, agent_bash_reliability_no_prereq/full, agent_praise_complaint/latest, agent_praise_complaint/full, agent_steerability/latest, agent_steerability/full, agent_task_outcome_explicit/latest, agent_task_outcome_explicit/full, agent_tool_hallucination/latest, agent_tool_hallucination/full, document/latest, document/full, document_style_control/latest, document_style_control/full, image_edit/latest, image_edit/full, image_to_video/latest, image_to_video/full, search/latest, search/full, search_factuality/latest, search_factuality/full, search_style_control/latest, search_style_control/full, text/latest, text/full, text_factuality/latest, text_factuality/full, text_style_control/latest, text_style_control/full, text_to_image/latest, text_to_image/full, text_to_video/latest, text_to_video/full, video_edit/latest, video_edit/full, vision/latest, vision/full, vision_style_control/latest, vision_style_control/full, webdev/latest, webdev/full
- LMArena text: model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date
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
| ChatGPT (görsel) | gpt-image-2.5-sunburst | — | lmarena, 2026-10-12 |
| DALL-E (OpenAI) | dall-e-3 | — | lmarena, 2026-10-12 |
| Google Imagen | imagen-ultra-4.0-generate-001 | — | lmarena, 2026-10-12 |
| Adobe Firefly | (eşleşen model yok) | — | — |
| Stable Diffusion | stable-diffusion-v35-large | — | lmarena, 2026-10-12 |
| FLUX (Black Forest Labs) | flux-2-max | — | lmarena, 2026-10-12 |
| Leonardo AI | lucid-origin | — | lmarena, 2026-10-12 |
| Ideogram | ideogram-4.0-quality | — | lmarena, 2026-10-12 |
| ChatGPT | gpt-5.6-sol-xhigh | — | lmarena, 2026-10-16 |
| Claude | claude-opus-5-high | — | lmarena, 2026-10-16 |
| Gemini | gemini-4-argon-high | — | lmarena, 2026-10-16 |
| Claude Code (Anthropic) | claude-opus-5-high | — | lmarena, 2026-10-16 |
| ElevenLabs | (eşleşen model yok) | — | — |
| Murf.ai | (eşleşen model yok) | — | — |
| Sora (OpenAI) | sora-2-pro | — | lmarena, 2026-10-12 |
| Google Veo | veo-3.1-audio | — | lmarena, 2026-10-16 |
| Perplexity AI | ppl-sonar-reasoning-pro-high | — | lmarena, 2026-10-16 |
| Runway | runway-gen4-aleph | — | lmarena, 2026-10-12 |
| Pika Labs | pika-v2.2 | — | lmarena, 2026-10-16 |
| Grok | grok-4.5 | — | lmarena, 2026-10-16 |
| Kling AI | kling-o3-pro | — | lmarena, 2026-10-12 |
| Luma Dream Machine | ray-3 | — | lmarena, 2026-10-16 |
| Gemini (görsel) | gemini-nano-banana-2.1 | — | lmarena, 2026-10-12 |
| Le Chat (Mistral) | mistral-large-4 | — | lmarena, 2026-10-16 |
| Grok Imagine (xAI) | grok-imagine-video-1.5-agent | — | lmarena, 2026-10-12 |
