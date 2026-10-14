// Deterministik doğrulama: rehberin validators'ı + hedef AI yeterlilik rubriği
// (lib/promptBuilder/sufficiency.ts). Başarısız varyant varsa hata mesajlarıyla
// BİR kez onarım üretimi; yine başarısızsa "kontrol edilmedi". howToUse araçta
// kullanım anlatmıyorsa aynı onarım turunda o da düzeltilir.

import type { GuideValidator } from './guideSchema';
import { generatePrompt, type GenerateInput, type GenerateOutput } from './generate';
import { allIssues, fold, howToUseIssues, quotedScript, validatorFails, type SufficiencyContext } from './sufficiency';
import type { Variant } from './types';

export function checkPrompt(prompt: string, validators: GuideValidator[]): string[] {
  return validators.filter((v) => validatorFails(prompt, v)).map((v) => v.message);
}

/** İlk üretimde amaçtaki varlıklar aranır; iyileştirmede kullanıcı bilerek değiştirmiş olabilir. */
export function sufficiencyContext(input: GenerateInput): SufficiencyContext {
  return {
    guide: input.guide,
    goal: input.session.goal,
    productName: input.productName,
    checkGoalEntities: !input.previous && !input.instruction,
    locale: input.session.locale,
    userMessages: input.session.userMessages,
  };
}

function check(output: GenerateOutput, ctx: SufficiencyContext): Record<string, string[]> {
  const failing: Record<string, string[]> = {};
  for (const v of output.variants) {
    const errors = [...new Set(allIssues(v, ctx).map((i) => i.message))];
    if (errors.length > 0) failing[v.id] = errors;
  }
  return failing;
}

/**
 * Ses aracı (metni sesli okur), ilk üretim: kullanıcı okunacak metni tırnakla verdiyse ve
 * varyant kuralı geçmeyip o metni içeriyorsa prompt doğrudan o metindir. LLM onarımı yok:
 * 2026-10-14 eval'de model "… kadın sesiyle: 'Bu derste…'" yazıp onarımda da aynısını
 * tekrar etti (15 bin token, sonuç yok). Kodla kesin yapılabilen işi modele bırakmıyoruz.
 */
export function useQuotedScript(output: GenerateOutput, input: GenerateInput, ctx: SufficiencyContext): GenerateOutput {
  if (input.guide.modality !== 'audio' || input.previous || input.instruction) return output;
  const script = quotedScript([...(input.session.userMessages ?? []), input.session.goal]);
  if (!script) return output;
  const key = fold(script).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const variants = output.variants.map((v) => {
    const failsGuide = ctx.guide.validators.some((x) => validatorFails(v.prompt, x));
    const contains = fold(v.prompt).replace(/[^\p{L}\p{N}]+/gu, ' ').includes(key);
    return failsGuide && contains ? { ...v, prompt: script } : v;
  });
  return { ...output, variants };
}

export async function validateWithRepair(
  output: GenerateOutput,
  input: GenerateInput
): Promise<{ variants: Variant[]; output: GenerateOutput; tokens: number; repaired: boolean }> {
  const ctx = sufficiencyContext(input);
  let current = useQuotedScript(output, input, ctx);
  let tokens = 0;
  let failing = check(current, ctx);
  let repaired = false;
  const usage = howToUseIssues(current.howToUse, input.productName);

  if (Object.keys(failing).length > 0 || usage.length > 0) {
    const repairErrors = { ...failing, ...(usage.length > 0 ? { howToUse: usage } : {}) };
    const repair = await generatePrompt({ ...input, repairErrors, previous: current });
    tokens += repair.tokens;
    repaired = true;
    // Sadece başarısız varyantlar değiştirilir; geçen varyant korunur.
    current = {
      ...current,
      variants: current.variants.map((v) => (failing[v.id] ? repair.output.variants.find((r) => r.id === v.id) ?? v : v)),
      ...(usage.length > 0 && howToUseIssues(repair.output.howToUse, input.productName).length === 0 ? { howToUse: repair.output.howToUse } : {}),
    };
    failing = check(current, ctx);
  }

  const variants: Variant[] = current.variants.map((v) => ({
    ...v,
    validation: failing[v.id] ? { status: 'unchecked', errors: failing[v.id] } : { status: 'passed', errors: [] },
  }));
  return { variants, output: current, tokens, repaired };
}
