// Analitik olayları (anonim). P7: çağrılar yerinde, gönderim no-op.
// P8 bunu /api/events'e bağlar. Ham içerik, mesaj metni ve IP gönderilmez.

export type AnalyticsEvent =
  | { name: 'prompt_question_shown'; props: { guideId: string } }
  | { name: 'prompt_generated'; props: { guideId: string; guideVersion: number; filledBy: { user: number; inferred: number; default: number } } }
  | { name: 'prompt_refined'; props: { guideId: string; refinementId: string } }
  | { name: 'prompt_copied'; props: { guideId: string; guideVersion: number; variant: 'safe' | 'creative'; versionN: number } };

export function trackEvent<E extends AnalyticsEvent>(name: E['name'], props: E['props']): void {
  void name;
  void props;
}
