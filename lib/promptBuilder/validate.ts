// Deterministik doğrulama: rehberin validators'ı. Başarısız varyant varsa hata
// mesajlarıyla BİR kez onarım üretimi; yine başarısızsa "kontrol edilmedi".

import type { Guide, GuideValidator } from './guideSchema';
import { generatePrompt, type GenerateInput, type GenerateOutput } from './generate';
import type { Variant } from './types';

export function checkPrompt(prompt: string, validators: GuideValidator[]): string[] {
  const errors: string[] = [];
  for (const v of validators) {
    if (v.type === 'regex' && !new RegExp(String(v.value)).test(prompt)) errors.push(v.message);
    if (v.type === 'maxLength' && prompt.length > Number(v.value)) errors.push(v.message);
    if (v.type === 'mustInclude' && !prompt.toLowerCase().includes(String(v.value).toLowerCase())) errors.push(v.message);
  }
  return errors;
}

function check(output: GenerateOutput, guide: Guide): Record<string, string[]> {
  const failing: Record<string, string[]> = {};
  for (const v of output.variants) {
    const errors = checkPrompt(v.prompt, guide.validators);
    if (errors.length > 0) failing[v.id] = errors;
  }
  return failing;
}

export async function validateWithRepair(
  output: GenerateOutput,
  input: GenerateInput
): Promise<{ variants: Variant[]; output: GenerateOutput; tokens: number; repaired: boolean }> {
  let current = output;
  let tokens = 0;
  let failing = check(current, input.guide);
  let repaired = false;

  if (Object.keys(failing).length > 0) {
    const repair = await generatePrompt({ ...input, repairErrors: failing, previous: current });
    tokens += repair.tokens;
    repaired = true;
    // Sadece başarısız varyantlar değiştirilir; geçen varyant korunur.
    current = {
      ...current,
      variants: current.variants.map((v) => (failing[v.id] ? repair.output.variants.find((r) => r.id === v.id) ?? v : v)),
    };
    failing = check(current, input.guide);
  }

  const variants: Variant[] = current.variants.map((v) => ({
    ...v,
    validation: failing[v.id] ? { status: 'unchecked', errors: failing[v.id] } : { status: 'passed', errors: [] },
  }));
  return { variants, output: current, tokens, repaired };
}
