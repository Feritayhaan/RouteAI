// Ajanın build_prompt aracı: oturum oluştur -> extract -> plan -> soru kartı
// ya da (generate -> validate -> PromptCard).

import type { BuildPromptFn } from '../agent/tools';
import { defaultPromptDeps } from './deps';
import { startPromptSession, type PromptDeps } from './service';

export function makeBuildPromptTool(depsFactory: () => PromptDeps = () => defaultPromptDeps()): BuildPromptFn {
  return async (args, locale, conversation) => {
    const result = await startPromptSession(
      { productId: args.productId, goal: args.goal, slots: args.slots, conversation, locale },
      depsFactory()
    );
    if ('error' in result) return { error: result.error, tokens: result.tokens };
    const card = result.card;
    return {
      card,
      tokens: result.tokens,
      summary:
        card.type === 'prompt_question'
          ? { shown: 'prompt_question_card', questions: card.questions.map((q) => q.slotId) }
          : { shown: 'prompt_card', guideId: card.guideId, variants: card.variants.length, draftGuide: card.draft },
    };
  };
}
