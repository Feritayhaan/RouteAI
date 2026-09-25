// Gizlilik sayfası metni (en/tr). Kodda gerçekte ne saklandığı:
// docs/privacy-verification.md. Metin değişirse o dosya da güncellenir.

import type { Locale } from './locale';

interface Section { title: string; items: string[] }
export interface PrivacyText { title: string; intro: string; updated: string; sections: Section[]; contact: string; back: string }

export const PRIVACY: Record<Locale, PrivacyText> = {
  en: {
    title: 'Privacy',
    intro: 'RouteAI has no accounts. We collect as little as possible and never sell data.',
    updated: 'Last updated: {date}',
    sections: [
      { title: 'What we collect', items: [
        'An anonymous session id generated in your browser (stored in localStorage). On our servers it is only stored as a one-way hash.',
        'Anonymous event counters per day (e.g. "a prompt was generated", "a prompt was copied"), with the prompt guide involved. No text you typed.',
        'Token usage totals for our monthly AI budget.',
      ] },
      { title: 'What we do not store', items: [
        'Your search text is not written to server logs. Logs contain only numbers and codes (text length, category, latency, tokens).',
        'Your IP address is used only for rate limiting and is kept in the rate limiter for at most about an hour.',
      ] },
      { title: 'Exceptions to know about', items: [
        'Prompt builder: while you refine a prompt, your stated goal, your refinement instructions and the generated prompts are kept for 24 hours so the session can continue, then deleted automatically.',
        'Navigator (home page): if you give a result a thumbs up or down, your search text is stored with the vote. The navigator also caches the analysed request for 24 hours.',
      ] },
      { title: 'Who processes your text', items: [
        'What you type (a search or a prompt goal) is sent to OpenAI to understand it and to write prompts. OpenAI processes it under its API terms.',
        'Page views are measured with Vercel Web Analytics (no cookies).',
      ] },
      { title: 'Data sources', items: [
        'Model benchmark data comes from Artificial Analysis (artificialanalysis.ai) and LMArena (lmarena.ai). We always show the source next to the data.',
      ] },
      { title: 'Your browser', items: [
        'localStorage holds the anonymous session id, your theme, whether you saw the welcome screen, and the star ratings you give on the navigator together with your search text. These stay in your browser; clearing site data removes them.',
      ] },
    ],
    contact: 'Contact: {email}',
    back: 'Back to RouteAI',
  },
  tr: {
    title: 'Gizlilik',
    intro: 'RouteAI\'da hesap yok. Olabildiğince az veri topluyoruz ve veri satmıyoruz.',
    updated: 'Son güncelleme: {date}',
    sections: [
      { title: 'Ne topluyoruz', items: [
        'Tarayıcında üretilen anonim bir oturum kimliği (localStorage\'da). Sunucularımızda sadece tek yönlü hash\'i saklanır.',
        'Günlük anonim olay sayaçları (ör. "bir prompt oluşturuldu", "bir prompt kopyalandı"), ilgili prompt rehberiyle. Yazdığın metin yok.',
        'Aylık yapay zekâ bütçemiz için token kullanım toplamları.',
      ] },
      { title: 'Neyi saklamıyoruz', items: [
        'Arama metnin sunucu loglarına yazılmaz. Loglarda sadece sayılar ve kodlar var (metin uzunluğu, kategori, gecikme, token).',
        'IP adresin sadece hız sınırlaması için kullanılır ve hız sınırlayıcıda en fazla yaklaşık bir saat durur.',
      ] },
      { title: 'Bilmen gereken istisnalar', items: [
        'Prompt oluşturucu: bir promptu iyileştirirken, oturumun devam edebilmesi için amacın, iyileştirme talimatların ve üretilen promptlar 24 saat tutulur, sonra kendiliğinden silinir.',
        'Navigasyon (ana sayfa): bir sonuca beğendim/beğenmedim dersen arama metnin oyla birlikte saklanır. Navigasyon ayrıca analiz edilen isteği 24 saat önbellekte tutar.',
      ] },
      { title: 'Metnini kim işliyor', items: [
        'Yazdığın metin (arama ya da prompt amacı) anlamak ve prompt yazmak için OpenAI\'a gönderilir. OpenAI bunu kendi API koşullarına göre işler.',
        'Sayfa görüntülemeleri Vercel Web Analytics ile ölçülür (çerez yok).',
      ] },
      { title: 'Veri kaynakları', items: [
        'Model benchmark verisi Artificial Analysis (artificialanalysis.ai) ve LMArena (lmarena.ai) kaynaklıdır. Verinin yanında kaynağı her zaman gösterilir.',
      ] },
      { title: 'Tarayıcın', items: [
        'localStorage; anonim oturum kimliğini, temanı, hoş geldin ekranını görüp görmediğini ve navigasyonda verdiğin yıldız puanlarını arama metninle birlikte tutar. Bunlar sadece tarayıcında kalır; site verisini silince kaybolur.',
      ] },
    ],
    contact: 'İletişim: {email}',
    back: 'RouteAI\'a dön',
  },
};

/** Metnin içeriğinin son değiştiği tarih (içerik değişince güncellenir). */
export const PRIVACY_UPDATED = '2026-09-25';
