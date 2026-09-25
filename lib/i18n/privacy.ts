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
        'Anonymous event counters per day (e.g. "a recommendation was shown", "a prompt was copied"), with the task or prompt guide involved. No message text.',
        'Your answers to "Did it do the job?", "Which was better?" and thumbs up/down, keyed by the hashed session id, product and task. These answers rank tools in the RouteAI Score.',
        'Token usage totals for our monthly AI budget.',
      ] },
      { title: 'What we do not store', items: [
        'Chat messages are not stored or logged. Server logs contain only numbers (task, tool-call counts, latency, tokens).',
        'Your IP address is used only for rate limiting and is kept in the rate limiter for at most about an hour.',
      ] },
      { title: 'Exceptions to know about', items: [
        'Prompt builder: while you refine a prompt, your stated goal, your refinement instructions and the generated prompts are kept for 24 hours so the session can continue, then deleted automatically.',
        'Navigator (home page): if you give a result a thumbs up or down, your search text is stored with the vote. The navigator also caches the analysed request for 24 hours.',
      ] },
      { title: 'Who processes your text', items: [
        'What you type (a search, a chat message or a prompt goal) is sent to OpenAI to understand it and to generate answers and prompts. OpenAI processes it under its API terms.',
        'Page views are measured with Vercel Web Analytics (no cookies).',
      ] },
      { title: 'Data sources', items: [
        'Model benchmark data comes from Artificial Analysis (artificialanalysis.ai) and LMArena (lmarena.ai). We always show the source next to the data.',
      ] },
      { title: 'Your browser', items: [
        'localStorage holds the anonymous session id, pending "did it do the job?" questions (dropped after 7 days), your theme, whether you saw the welcome screen, and the star ratings you give on the navigator together with your search text. These stay in your browser; clearing site data removes them.',
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
        'Günlük anonim olay sayaçları (ör. "bir öneri gösterildi", "bir prompt kopyalandı"), ilgili görev ya da prompt rehberiyle. Mesaj metni yok.',
        '"İşini gördü mü?", "Hangisi daha iyiydi?" ve beğeni cevapların; hash\'lenmiş oturum kimliği, ürün ve görevle. Bu cevaplar RouteAI Skoru\'nda araçları sıralar.',
        'Aylık yapay zekâ bütçemiz için token kullanım toplamları.',
      ] },
      { title: 'Neyi saklamıyoruz', items: [
        'Sohbet mesajları saklanmaz ve loglanmaz. Sunucu loglarında sadece sayılar var (görev, araç çağrısı sayıları, gecikme, token).',
        'IP adresin sadece hız sınırlaması için kullanılır ve hız sınırlayıcıda en fazla yaklaşık bir saat durur.',
      ] },
      { title: 'Bilmen gereken istisnalar', items: [
        'Prompt oluşturucu: bir promptu iyileştirirken, oturumun devam edebilmesi için amacın, iyileştirme talimatların ve üretilen promptlar 24 saat tutulur, sonra kendiliğinden silinir.',
        'Navigasyon (ana sayfa): bir sonuca beğendim/beğenmedim dersen arama metnin oyla birlikte saklanır. Navigasyon ayrıca analiz edilen isteği 24 saat önbellekte tutar.',
      ] },
      { title: 'Metnini kim işliyor', items: [
        'Yazdığın metin (arama, sohbet mesajı ya da prompt amacı) anlamak, cevap ve prompt üretmek için OpenAI\'a gönderilir. OpenAI bunu kendi API koşullarına göre işler.',
        'Sayfa görüntülemeleri Vercel Web Analytics ile ölçülür (çerez yok).',
      ] },
      { title: 'Veri kaynakları', items: [
        'Model benchmark verisi Artificial Analysis (artificialanalysis.ai) ve LMArena (lmarena.ai) kaynaklıdır. Verinin yanında kaynağı her zaman gösterilir.',
      ] },
      { title: 'Tarayıcın', items: [
        'localStorage; anonim oturum kimliğini, bekleyen "işini gördü mü?" sorularını (7 gün sonra düşer), temanı, hoş geldin ekranını görüp görmediğini ve navigasyonda verdiğin yıldız puanlarını arama metninle birlikte tutar. Bunlar sadece tarayıcında kalır; site verisini silince kaybolur.',
      ] },
    ],
    contact: 'İletişim: {email}',
    back: 'RouteAI\'a dön',
  },
};

/** Metnin içeriğinin son değiştiği tarih (içerik değişince güncellenir). */
export const PRIVACY_UPDATED = '2026-09-25';
